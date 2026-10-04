// Write the length into a MediaRecorder WebM file.
//
// MediaRecorder writes WebM as a live stream: the Segment's size is "unknown"
// and its Info element has no Duration, because neither is known until the end.
// Players then treat the file as live — Chrome shows no length and seeking is
// poor — which is no way to watch an hour-long replay. This inserts the
// Duration element into Info once the length is known.
//
// Only the first 64 KB is read and rebuilt; the rest of the file is passed
// through as a Blob slice, so a recording streamed to disk is patched by
// copying, never by loading it into memory.
//
// Deliberately conservative: anything it doesn't recognise (a SeekHead or Cues,
// whose byte offsets an insertion would break; an Info that already has a
// Duration; a header that isn't where MediaRecorder puts it) comes back
// untouched.

const ID_EBML = 0x1a45dfa3
const ID_SEGMENT = 0x18538067
const ID_SEEKHEAD = 0x114d9b74
const ID_INFO = 0x1549a966
const ID_CUES = 0x1c53bb6b
const ID_CLUSTER = 0x1f43b675
const ID_TIMECODE_SCALE = 0x2ad7b1
const ID_DURATION = 0x4489

interface Element {
  start: number
  id: number
  idEnd: number
  size: number
  sizeLen: number
  sizeUnknown: boolean
  dataStart: number
  dataEnd: number
}

function vintLength(first: number): number {
  for (let len = 1; len <= 8; len++) {
    if (first & (0x80 >> (len - 1))) return len
  }
  return 0
}

function readElement(b: Uint8Array, start: number): Element | null {
  if (start >= b.length) return null
  const idLen = vintLength(b[start])
  if (idLen < 1 || idLen > 4 || start + idLen > b.length) return null
  let id = 0
  for (let i = 0; i < idLen; i++) id = id * 256 + b[start + i]
  const sp = start + idLen
  if (sp >= b.length) return null
  const sizeLen = vintLength(b[sp])
  if (sizeLen < 1 || sp + sizeLen > b.length) return null
  let size = b[sp] & (0xff >> sizeLen)
  let allOnes = size === 0xff >> sizeLen
  for (let i = 1; i < sizeLen; i++) {
    size = size * 256 + b[sp + i]
    if (b[sp + i] !== 0xff) allOnes = false
  }
  const dataStart = sp + sizeLen
  return {
    start,
    id,
    idEnd: sp,
    size,
    sizeLen,
    sizeUnknown: allOnes,
    dataStart,
    dataEnd: allOnes ? Number.POSITIVE_INFINITY : dataStart + size,
  }
}

/** Encode `value` as an EBML size in `len` bytes, or the fewest that fit. */
function encodeSize(value: number, len: number): Uint8Array<ArrayBuffer> {
  let n = Math.max(1, len)
  while (n < 8 && value >= 2 ** (7 * n) - 1) n++
  const out = new Uint8Array(n)
  let v = value
  for (let i = n - 1; i >= 0; i--) {
    out[i] = v % 256
    v = Math.floor(v / 256)
  }
  out[0] |= 0x80 >> (n - 1)
  return out
}

function readUint(b: Uint8Array, start: number, end: number): number {
  let v = 0
  for (let i = start; i < end; i++) v = v * 256 + b[i]
  return v
}

/** The same Blob with a Duration element, or the original if it can't be done safely. */
export async function withWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  try {
    if (!/webm/i.test(blob.type) || !(durationMs > 0)) return blob
    const head = new Uint8Array(await blob.slice(0, 65536).arrayBuffer())

    const ebml = readElement(head, 0)
    if (!ebml || ebml.id !== ID_EBML || ebml.sizeUnknown) return blob
    const seg = readElement(head, ebml.dataEnd)
    if (!seg || seg.id !== ID_SEGMENT) return blob

    let info: Element | null = null
    let p = seg.dataStart
    while (p < head.length) {
      const el = readElement(head, p)
      if (!el) return blob
      if (el.id === ID_SEEKHEAD || el.id === ID_CUES || el.id === ID_CLUSTER) return blob
      if (el.id === ID_INFO) {
        info = el
        break
      }
      if (el.sizeUnknown) return blob
      p = el.dataEnd
    }
    if (!info || info.sizeUnknown || info.dataEnd > head.length) return blob

    let scale = 1_000_000
    for (let q = info.dataStart; q < info.dataEnd; ) {
      const child = readElement(head, q)
      if (!child || child.sizeUnknown) return blob
      if (child.id === ID_DURATION) return blob
      if (child.id === ID_TIMECODE_SCALE && child.size <= 8) scale = readUint(head, child.dataStart, child.dataEnd) || scale
      q = child.dataEnd
    }

    const duration = new Uint8Array(11)
    duration.set([0x44, 0x89, 0x88])
    new DataView(duration.buffer).setFloat64(3, (durationMs * 1_000_000) / scale)

    const infoSize = encodeSize(info.size + duration.length, info.sizeLen)
    const grew = duration.length + (infoSize.length - info.sizeLen)
    const segSize = seg.sizeUnknown
      ? head.slice(seg.idEnd, seg.dataStart)
      : encodeSize(seg.size + grew, seg.sizeLen)
    if (!seg.sizeUnknown && segSize.length !== seg.sizeLen) return blob

    return new Blob(
      [
        head.slice(0, seg.idEnd),
        segSize,
        head.slice(seg.dataStart, info.idEnd),
        infoSize,
        head.slice(info.dataStart, info.dataEnd),
        duration,
        blob.slice(info.dataEnd),
      ],
      { type: blob.type },
    )
  } catch {
    return blob
  }
}

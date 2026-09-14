// Self-contained SVG mockup of the live room used on the landing page.
// Uses SVG SMIL (<animate>, <animateTransform>) so animations ship inline
// without any extra CSS plumbing. Three things move:
//   - the host's right arm waves (rotating around the shoulder)
//   - the LIVE dot pulses
//   - hearts / claps / confetti rise and fade out of the video panel
export function WebinarPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -inset-y-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/40 via-amber-100/30 dark:via-amber-950/30 to-transparent blur-3xl"
      />
      <svg
        viewBox="0 0 800 480"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Preview of the live webinar room with a host on camera waving, a chat panel, and floating reactions"
        className="block w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft"
      >
        <defs>
          <linearGradient id="videoBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1f2a44" />
            <stop offset="1" stopColor="#0b1220" />
          </linearGradient>
          <clipPath id="videoClip">
            <rect x="24" y="80" width="500" height="320" rx="16" />
          </clipPath>
        </defs>

        <style>{`
          .preview-host-zoom {
            transform-box: fill-box;
            transform-origin: 42% 25%;
            animation: preview-host-zoom 8s ease-in-out infinite;
          }
          @keyframes preview-host-zoom {
            0%, 25%   { transform: scale(1); }
            45%, 65%  { transform: scale(1.35); }
            85%, 100% { transform: scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .preview-host-zoom { animation: none; }
          }
          /* Dark theme. The picture is of the app's chrome, so it follows
             the theme like the chrome does — but ONLY the elements tagged
             wp-*: the host figure reuses #0f172a for its eyes and smile, so
             a blanket swap by colour would black them out. A CSS fill beats
             the presentation attribute, which is what keeps light untouched:
             these rules match nothing until <html> carries .dark. */
          .dark .wp-ink { fill: #f1f5f9; }
          .dark .wp-muted { fill: #94a3b8; }
          .dark .wp-faint { fill: #64748b; }
          .dark .wp-line { stroke: #1e293b; }
          .dark .wp-panel { fill: #020617; stroke: #1e293b; }
          .dark .wp-bubble { fill: #1e293b; }
          .dark .wp-bubble-text { fill: #cbd5e1; }
          .dark .wp-input { fill: #0f172a; stroke: #1e293b; }
          .dark .wp-live { fill: #fca5a5; }
          .dark .wp-chip { fill: #020617; stroke: #9a3412; }
          .dark .wp-chip-text { fill: #fdba74; }
        `}</style>

        {/* Header strip */}
        <line className="wp-line" x1="0" y1="56" x2="800" y2="56" stroke="#e2e8f0" />
        <text
          className="wp-ink"
          x="32"
          y="36"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="14"
          fontWeight="600"
          fill="#0f172a"
        >
          Q4 welcome session
        </text>
        <text
          className="wp-muted"
          x="32"
          y="50"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fill="#64748b"
        >
          Universal Webinar
        </text>
        <circle cx="704" cy="33" r="5" fill="#dc2626">
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          className="wp-live"
          x="716"
          y="38"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#7f1d1d"
        >
          LIVE
        </text>
        <text
          className="wp-muted"
          x="748"
          y="38"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fill="#64748b"
        >
          · 42 watching
        </text>

        {/* Video panel */}
        <rect x="24" y="80" width="500" height="320" rx="16" fill="url(#videoBg)" />

        <g clipPath="url(#videoClip)">
          {/* Host figure — translate(274, 160) places the head around the
              centre of the video panel and the body bottom flush with it.
              The inner group runs the webcam-zoom CSS animation, scaling
              around the face (~42% / 25% of the figure's bounding box).
              Anything scaled past the video panel is hidden by videoClip. */}
          <g transform="translate(274, 160)">
            <g className="preview-host-zoom">
              {/* Body */}
              <path
                d="M -85 240 Q -85 130 0 130 Q 85 130 85 240 Z"
                fill="#e05504"
              />
              {/* Collar highlight */}
              <path
                d="M -45 145 Q 0 165 45 145 L 35 170 Q 0 185 -35 170 Z"
                fill="#b53d04"
                opacity="0.5"
              />
              {/* Neck */}
              <rect x="-14" y="103" width="28" height="36" fill="#f5c089" />
              {/* Head */}
              <circle cx="0" cy="68" r="50" fill="#f5c089" />
              {/* Hair */}
              <path
                d="M -50 56 Q -46 22 0 18 Q 46 22 50 56 Q 44 32 30 28 Q 0 22 -30 28 Q -44 32 -50 56 Z"
                fill="#5d3a1f"
              />
              {/* Eyes */}
              <circle cx="-16" cy="64" r="3" fill="#0f172a" />
              <circle cx="16" cy="64" r="3" fill="#0f172a" />
              {/* Smile */}
              <path
                d="M -14 86 Q 0 96 14 86"
                stroke="#0f172a"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Left arm — static, hanging down */}
              <path
                d="M -72 143 L -86 215"
                stroke="#f5c089"
                strokeWidth="18"
                strokeLinecap="round"
              />

              {/* Right arm — waving, rotates around the shoulder (72, 143) */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-14 72 143; 26 72 143; -14 72 143"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <path
                  d="M 72 143 L 112 62"
                  stroke="#f5c089"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <circle cx="112" cy="62" r="14" fill="#f5c089" />
              </g>
            </g>
          </g>

          {/* Floating reactions — three emoji rising on staggered delays */}
          <FloatingEmoji emoji="❤️" x={430} y={372} size={22} delay="0s" />
          <FloatingEmoji emoji="🎉" x={470} y={372} size={18} delay="-1.2s" />
          <FloatingEmoji emoji="👏" x={395} y={372} size={20} delay="-2.4s" />

          {/* Reaction toolbar in the video */}
          <g transform="translate(35, 358)">
            <rect width="138" height="28" rx="14" fill="#0b1220" opacity="0.7" />
            <rect
              x="0.5"
              y="0.5"
              width="137"
              height="27"
              rx="13.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.1"
            />
            <text x="14" y="19" fontSize="13">❤️</text>
            <text x="38" y="19" fontSize="13">👏</text>
            <text x="62" y="19" fontSize="13">🎉</text>
            <text x="86" y="19" fontSize="13">🔥</text>
            <text
              x="112"
              y="19"
              fontSize="11"
              fontFamily="Inter, system-ui, sans-serif"
              fill="#cbd5e1"
            >
              ✦
            </text>
          </g>
        </g>

        {/* Chat panel */}
        <rect className="wp-panel" x="544" y="80" width="232" height="320" rx="16" fill="white" stroke="#e2e8f0" />
        <line className="wp-line" x1="544" y1="116" x2="776" y2="116" stroke="#e2e8f0" />
        <text
          className="wp-ink"
          x="560"
          y="104"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="13"
          fontWeight="600"
          fill="#0f172a"
        >
          Chat
        </text>
        <text
          className="wp-muted"
          x="760"
          y="104"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="10"
          fill="#94a3b8"
          textAnchor="end"
        >
          live
        </text>

        {/* Sara */}
        <ChatRow x={560} y={140} author="Sara" body="Hello! 👋" />
        {/* Marco */}
        <ChatRow x={560} y={190} author="Marco" body="Excited for this!" />
        {/* Reaction chip under Marco */}
        <g transform="translate(560, 222)">
          <rect className="wp-chip" width="42" height="16" rx="8" fill="white" stroke="#fbd0a8" />
          <text
            className="wp-chip-text"
            x="6"
            y="12"
            fontSize="9"
            fontFamily="Inter, system-ui, sans-serif"
            fill="#b54708"
          >
            ❤️ 3
          </text>
        </g>

        {/* You (right-aligned) */}
        <text
          className="wp-muted"
          x="758"
          y="265"
          textAnchor="end"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="10"
          fontWeight="500"
          fill="#64748b"
        >
          You
        </text>
        <rect x="612" y="272" width="146" height="22" rx="8" fill="#e05504" />
        <text
          x="622"
          y="287"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fill="#ffffff"
        >
          Loving the chat 💬
        </text>

        {/* Alex */}
        <ChatRow x={560} y={320} author="Alex" body="When does Q&A start?" />

        {/* Chat input */}
        <rect
          className="wp-input"
          x="560"
          y="368"
          width="200"
          height="22"
          rx="8"
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        <text
          className="wp-faint"
          x="568"
          y="383"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="10"
          fill="#94a3b8"
        >
          Say something kind…
        </text>

        {/* Footer strip under the room */}
        <text
          className="wp-muted"
          x="32"
          y="438"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fill="#64748b"
        >
          42 watching
        </text>
        <text
          className="wp-faint"
          x="120"
          y="438"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fill="#94a3b8"
        >
          · speaker requests off
        </text>
        <g transform="translate(620, 422)">
          <rect width="148" height="22" rx="11" fill="#e05504" />
          <text
            x="74"
            y="15"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#ffffff"
          >
            ✋ Request to speak
          </text>
        </g>
      </svg>
    </div>
  )
}

interface FloatingEmojiProps {
  emoji: string
  x: number
  y: number
  size: number
  delay: string
}

function FloatingEmoji({ emoji, x, y, size, delay }: FloatingEmojiProps) {
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 8; 0 -120"
        dur="3.5s"
        begin={delay}
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.15;0.8;1"
        dur="3.5s"
        begin={delay}
        repeatCount="indefinite"
      />
      <text x={x} y={y} fontSize={size}>
        {emoji}
      </text>
    </g>
  )
}

interface ChatRowProps {
  x: number
  y: number
  author: string
  body: string
}

function ChatRow({ x, y, author, body }: ChatRowProps) {
  return (
    <g>
      <text
        className="wp-muted"
        x={x}
        y={y}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="10"
        fontWeight="500"
        fill="#64748b"
      >
        {author}
      </text>
      <rect
        className="wp-bubble"
        x={x}
        y={y + 6}
        width={Math.max(80, body.length * 6.5)}
        height="22"
        rx="8"
        fill="#f1f5f9"
      />
      <text
        className="wp-bubble-text"
        x={x + 10}
        y={y + 21}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="11"
        fill="#334155"
      >
        {body}
      </text>
    </g>
  )
}

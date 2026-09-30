/**
 * Tune this app ▸ Reset to defaults — Webinar's own part.
 *
 * James, 2026-09-30: every Tune this app has a Reset to defaults. The SDK
 * resets the language and colour scheme itself; the navbar's
 * `onResetDefaults` covers the layout preferences only this app knows about:
 * the host panel column (order + collapsed cards) and where the host and the
 * guests parked the presenter's camera bubble.
 *
 * ⚠️ Deliberately NOT here: `uw:lastName` / `uw:lastEmail` (who you are, not
 * how the app looks) and the per-webinar manage tokens (losing one locks a host
 * out of their own webinar).
 *
 * The hooks that own those layouts are mounted only on their pages, so the
 * reset clears storage and then announces itself: a mounted hook listens for
 * RESET_PREFS_EVENT and puts its live state back, and one that isn't mounted
 * reads the cleared storage next time it is.
 */

export const HOST_PANELS_KEY = 'unisim-webinar-host-panels'
export const CAMERA_BUBBLE_HOST_KEY = 'unisim-webinar-camera-bubble-host'
export const CAMERA_BUBBLE_GUEST_KEY = 'unisim-webinar-camera-bubble-guest'

export const RESET_PREFS_EVENT = 'unisim-webinar:reset-prefs'

export function resetWebinarPrefs(): void {
  for (const key of [HOST_PANELS_KEY, CAMERA_BUBBLE_HOST_KEY, CAMERA_BUBBLE_GUEST_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Private mode: nothing was persisted to clear.
    }
  }
  window.dispatchEvent(new Event(RESET_PREFS_EVENT))
}

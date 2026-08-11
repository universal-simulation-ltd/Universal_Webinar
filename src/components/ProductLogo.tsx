// GENERATED FILE — do not edit by hand.
// Source: backoffice/universal-platform/scripts/app-marks/marks.mjs
// Regenerate: node scripts/app-marks/build.mjs (from backoffice/universal-platform)
// Mark: Universal Webinar — A camera body with its lens swung out.
// Hover: The lens swings out — the camera goes live.
//
// Icon-only by design: the SDK's UniversalAppsNavBar renders the product name
// from its catalogue beside this slot, so a wordmark here would print it twice.

const CSS = `
  /* Resting states */
  .uam-webinar-lens { transform: translateX(-7px); opacity: 0.4; transition: transform .5s cubic-bezier(0.16,1,0.3,1), opacity .4s ease; }

  /* Active states */
  .uam-host-webinar:hover .uam-webinar-lens,
  .uam-host-webinar:focus-visible .uam-webinar-lens { transform: translateX(0); opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .uam-webinar-lens { transition: none !important; }
  }
`

export default function ProductLogo() {
  return (
    <span
      className="uam-host-webinar inline-flex h-6 w-6 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <style>{CSS}</style>
      <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
        <rect x="0" y="0" width="64" height="64" rx="14" fill="#0f172a" />
        <path d="M14 22.5C14 19.46 16.46 17 19.5 17h17C39.54 17 42 19.46 42 22.5v19C42 44.54 39.54 47 36.5 47h-17C16.46 47 14 44.54 14 41.5v-19Z" fill="#ffffff" />
        <path d="M52 24.5a1.5 1.5 0 0 0-2.32-1.25L44 26.9v10.2l5.68 3.65A1.5 1.5 0 0 0 52 39.5V24.5Z" fill="#fe8c01" className="uam-webinar-lens" />
      </svg>
    </span>
  )
}

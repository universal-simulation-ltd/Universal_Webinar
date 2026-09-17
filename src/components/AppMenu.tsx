import { AdvancedMenu } from '@unisim/sdk'
// Generated — `npm run credits` after any dependency change. Never edit it by
// hand: it is read off the installed tree, so a hand-kept list drifts from the
// lockfile the first time anyone upgrades anything, and a credits list naming a
// package we removed is worse than no list at all.
import credits from '../generated/credits.json'
import { useThemeStore } from '@/stores/themeStore'

// The per-app rows that slot into <UniversalAppsNavBar />'s `actions` prop —
// ROWS ONLY, no trigger and no panel of its own. The SDK renders them inside
// the merged profile pill.
//
// Only the SDK's Advanced section is left, and it is told the RESOLVED theme
// itself — the bar's `theme` prop does not reach it.
//
// There is no Appearance section here any more: since SDK 0.143.0 the colour
// scheme is a Global preference, and this app's override of it is the Colour
// scheme row in the SDK's App preferences (Layout hands the bars `themeStore`).
// Any row added back here is ours and inline-styled, so it cannot answer the
// `.dark` class: take its colours from the SDK's `MENU` palette for `theme`.

export function AppMenu() {
  const theme = useThemeStore((s) => s.effective)

  return (
    <>
      {/* Advanced — the SDK's own category, so every app in the suite has one
          in the same place, and whatever goes in it next is one change rather
          than nineteen. "About this app" is always its last row. */}
      <AdvancedMenu
        theme={theme}
        about={{
          repo: 'https://github.com/universal-simulation-ltd/Universal_Webinar',
          // Server-backed: the local-first claim is not true here.
          privacy: false,
          credits,
          noticesHref:
            'https://github.com/universal-simulation-ltd/Universal_Webinar/blob/main/THIRD-PARTY-NOTICES.md',
        }}
      />
    </>
  )
}

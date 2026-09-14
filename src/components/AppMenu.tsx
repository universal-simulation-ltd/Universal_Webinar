import { useState } from 'react'
import { AdvancedMenu, MENU } from '@unisim/sdk'
// Generated — `npm run credits` after any dependency change. Never edit it by
// hand: it is read off the installed tree, so a hand-kept list drifts from the
// lockfile the first time anyone upgrades anything, and a credits list naming a
// package we removed is worse than no list at all.
import credits from '../generated/credits.json'
import { useThemeStore, type ThemePref } from '@/stores/themeStore'

// The per-app rows that slot into <UniversalAppsNavBar />'s `actions` prop —
// ROWS ONLY, no trigger and no panel of its own. The SDK renders them inside
// the merged profile pill.
//
// ⚠️ The SDK themes the bar and its dropdown panel from the `theme` prop, but
// NOT these rows: they are ours, and inline-styled to match the SDK's own row
// rhythm, so they cannot answer the `.dark` class. Every colour here comes from
// the SDK's `MENU` palette for the RESOLVED theme — hardcoded light greys would
// be all but invisible in the dark panel.

const THEMES: { pref: ThemePref; label: string; glyph: string }[] = [
  { pref: 'light', label: 'Light', glyph: '☀️' },
  { pref: 'dark', label: 'Dark', glyph: '🌙' },
  // Offered, but deliberately NOT the default — the suite opens light.
  { pref: 'system', label: 'Match my device', glyph: '🖥️' },
]

export function AppMenu() {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  const theme = useThemeStore((s) => s.effective)
  const m = MENU[theme]

  return (
    <>
      <div
        style={{
          padding: '8px 14px 4px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: m.muted,
        }}
      >
        Appearance
      </div>
      {THEMES.map((t) => (
        <ThemeRow
          key={t.pref}
          glyph={t.glyph}
          label={t.label}
          selected={pref === t.pref}
          onClick={() => setPref(t.pref)}
          palette={m}
        />
      ))}

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

function ThemeRow({
  glyph,
  label,
  selected,
  onClick,
  palette: m,
}: {
  glyph: string
  label: string
  selected: boolean
  onClick: () => void
  palette: (typeof MENU)['light']
}) {
  const [hover, setHover] = useState(false)
  const lit = selected || hover
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 14px',
        fontSize: 13,
        fontFamily: 'inherit',
        textAlign: 'left',
        border: 0,
        background: selected ? m.accentBg : hover ? m.rowHover : 'transparent',
        color: selected ? m.accentText : hover ? m.rowHoverText : m.body,
        cursor: 'pointer',
        transition: 'background 120ms, color 120ms',
      }}
    >
      <span aria-hidden>{glyph}</span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
      {selected && (
        <span aria-hidden style={{ color: lit ? m.accentText : m.body }}>
          ✓
        </span>
      )}
    </button>
  )
}

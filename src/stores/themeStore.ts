import { createThemeStore, type ThemePref } from '@unisim/sdk'

// The light/dark/system preference. The store itself lives in @unisim/sdk
// (createThemeStore, since 0.140.0) — this file only names the key. It opens
// LIGHT and stays light until the user chooses otherwise (the suite rule).
//
// ⚠️ The key is every user's saved choice. Renaming it silently resets them all
// to light. `index.html` holds a second copy for its pre-paint script, and
// `scripts/theme.test.mjs` fails if the two ever drift.
export type { ThemePref }

export const useThemeStore = createThemeStore('unisim-webinar-theme')

import { createThemeStore, type ThemePref } from '@unisim/sdk'

// The light/dark/system preference. The store itself lives in @unisim/sdk
// (createThemeStore, since 0.140.0) — this file only names the key. It opens
// LIGHT and stays light until the user chooses otherwise (the suite rule).
//
// Since SDK 0.143.0 the key holds this app's OVERRIDE of the suite-wide colour
// scheme: absent = follow Global preferences (`universal:color-scheme`, itself
// light until chosen). The override is set from the menu's App preferences.
//
// ⚠️ The key is every user's saved choice. Renaming it silently puts them all
// back to following global. `index.html` holds a second copy for its pre-paint script, and
// `scripts/theme.test.mjs` fails if the two ever drift.
export type { ThemePref }

export const useThemeStore = createThemeStore('unisim-webinar-theme')

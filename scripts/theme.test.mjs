// The theme key is written down TWICE, and this is what stops the two drifting.
//
// `src/stores/themeStore.ts` names it for the SDK's store; `index.html` names it
// again in the inline script that puts `.dark` on <html> before the first paint
// (the store applies the same class, but not until the module bundle has
// parsed). A bundled module and a script that runs during head parsing cannot
// share one constant — so instead, renaming either without the other fails here.
//
// Not a style rule: the key IS every user's saved choice. Change it and
// everybody who chose dark is silently back on light.
//
// Run: npm run test:theme
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const match = /createThemeStore\('([^']+)'\)/.exec(read('src/stores/themeStore.ts'))
assert.ok(match, 'themeStore.ts no longer calls createThemeStore with a literal key')
const key = match[1]

const html = read('index.html')
const head = html.slice(0, html.indexOf('</head>'))

assert.ok(
  head.includes(`localStorage.getItem('${key}')`),
  `index.html's pre-paint script must read the same key as the store ('${key}')`,
)
// The key is only this app's override (SDK 0.143.0); absent, the global choice
// applies, and the first frame has to show it too.
assert.ok(
  head.includes("localStorage.getItem('universal:color-scheme')"),
  "index.html's pre-paint script must fall back to the global 'universal:color-scheme'",
)
assert.ok(head.includes("classList.add('dark')"), 'the pre-paint script must add the dark class')
// 'system' has to be honoured before paint too, or somebody on the OS setting
// gets the light ground first and the dark one once the bundle catches up.
assert.ok(head.includes('prefers-color-scheme: dark'), "the pre-paint script must honour 'system'")
// Light is the default (the suite rule), so the script only ever ADDS.
assert.ok(!head.includes("classList.remove('dark')"), 'the pre-paint script must never remove the dark class')

console.log(`theme: ok — store and pre-paint script agree on '${key}'`)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't crash the build; the app shows a setup screen if these are missing.
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
      'See SUPABASE.md.',
  )
}

// Use `||` (not `??`) so empty strings also fall back. GitHub Actions injects
// an empty string for any `${{ secrets.* }}` reference whose secret isn't set,
// so `??` (which only catches null/undefined) would leave the URL as "" and
// `createClient("")` throws "supabaseUrl is required." at module load,
// crashing the whole app with a white page.
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey)

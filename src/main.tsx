import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UniversalProvider } from '@unisim/sdk'
import App from './App'
import { AuthProvider } from './lib/auth'
import './index.css'

// Fall back to a dummy URL/key when the platform Supabase env vars aren't set.
// Without this, createClient() inside <UniversalProvider> throws
// "supabaseUrl is required." synchronously during render and the whole app
// renders as a white page. The fallback keeps the tree mounted; the
// suite-wide UniversalBar features just stay inert until the secrets are set.
const universalConfig = {
  supabaseUrl:
    import.meta.env.VITE_PLATFORM_SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey:
    import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY || 'public-anon-key',
  product: 'webinar' as const,
  cookieDomain: import.meta.env.PROD ? '.unisim.co.uk' : undefined,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UniversalProvider config={universalConfig}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </UniversalProvider>
  </StrictMode>,
)

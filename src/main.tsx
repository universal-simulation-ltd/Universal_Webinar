import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UniversalProvider } from '@unisim/sdk'
import App from './App'
import { AuthProvider } from './lib/auth'
import './index.css'

// Fall back to the REAL public suite project when the platform Supabase env
// vars aren't set at build time (publishable anon key — safe to ship; RLS is the
// security boundary). The previous localhost fallback kept the tree mounted but
// left the SDK on a dead project, so the suite session never resolved and the
// navbar showed no profile/avatar on the deployed site. Env vars override.
const universalConfig = {
  supabaseUrl:
    import.meta.env.VITE_PLATFORM_SUPABASE_URL || 'https://rygfxgalojojppxmhddo.supabase.co',
  supabaseAnonKey:
    import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Z4Z2Fsb2pvanBweG1oZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTY4MjUsImV4cCI6MjA5NDMzMjgyNX0.hLy_vt9vY_rdPKF3nL32yAuMCD604E3CH5VM7D7CaNE',
  product: 'webinar' as const,
  cookieDomain: import.meta.env.PROD ? '.unisim.co.uk' : undefined,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UniversalProvider config={universalConfig}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </UniversalProvider>
  </StrictMode>,
)

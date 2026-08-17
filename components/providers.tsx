import { AuthProvider } from '@/components/auth-provider'
import { SiteShell } from '@/components/site-shell'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SiteShell>{children}</SiteShell>
    </AuthProvider>
  )
}

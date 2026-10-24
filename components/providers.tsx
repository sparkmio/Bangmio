import { AuthProvider } from '@/components/auth-provider'
import { AppearanceProvider } from '@/components/appearance-provider'
import { SiteShell } from '@/components/site-shell'
import { BindBangumiModal } from '@/components/bind-bangumi-modal'
import { VueToastProvider } from '@/components/vue-toast'
import { AiChat } from '@/components/ai-chat'
import { Suspense } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppearanceProvider>
        <VueToastProvider>
          <SiteShell>{children}</SiteShell>
          <Suspense fallback={null}>
            <BindBangumiModal />
          </Suspense>
          <AiChat />
        </VueToastProvider>
      </AppearanceProvider>
    </AuthProvider>
  )
}

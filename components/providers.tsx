import { AuthProvider } from '@/components/auth-provider'
import { SiteShell } from '@/components/site-shell'
import { VueBindBangumiModal } from '@/components/vue-bind-bangumi-modal'
import { VueToastProvider } from '@/components/vue-toast'
import { AiChat } from '@/components/ai-chat'
import { Suspense } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <VueToastProvider>
        <SiteShell>{children}</SiteShell>
        <Suspense fallback={null}>
          <VueBindBangumiModal />
        </Suspense>
        <AiChat />
      </VueToastProvider>
    </AuthProvider>
  )
}

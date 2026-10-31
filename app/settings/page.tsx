import type { Metadata } from 'next'
import { SettingsPage } from '@/components/account-pages'

export const metadata: Metadata = { title: '设置' }

export default function SettingsRoute() {
  return <SettingsPage />
}

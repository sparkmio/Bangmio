import { ProfilePage } from '@/components/account-pages'
export default async function PublicProfileRoute({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; return <ProfilePage username={username} /> }

'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from './auth-provider'
import { useVueToast } from './vue-toast'

export function VueBindBangumiModal() {
  const { showBindModal, setShowBindModal, bindBangumi, getOAuthBindUrl } = useAuth()
  const toast = useVueToast()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [bangumiToken, setBangumiToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!showBindModal) return null

  const returnUrl = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`
  const close = () => { if (!busy) setShowBindModal(false) }
  const handleOAuthBind = async () => {
    setBusy(true); setError('')
    try { window.location.assign(await getOAuthBindUrl()) } catch (cause) { setError(cause instanceof Error ? cause.message : '无法发起授权') ; setBusy(false) }
  }
  const handleBind = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!bangumiToken.trim()) return
    setBusy(true); setError('')
    try { await bindBangumi(bangumiToken.trim()); setBangumiToken(''); setShowBindModal(false); toast.success('Bangumi 账号已绑定') } catch (cause) { setError(cause instanceof Error ? cause.message : '绑定失败') } finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="bind-bangumi-title">
    <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="关闭绑定弹窗" type="button" onClick={close} />
    <div className="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-base-300">
      <button className="absolute top-3 right-3 text-base-content/40 hover:text-base-content transition-colors" type="button" onClick={close} aria-label="关闭"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" /></svg></button>
      <div className="text-center mb-4"><h2 id="bind-bangumi-title" className="text-lg font-bold text-base-content">绑定 Bangumi 账号</h2><p className="text-sm text-base-content/60 mt-1.5">需要绑定 Bangumi 账号才能使用番剧功能</p></div>
      {error ? <div className="alert alert-error mb-3 text-sm"><span>{error}</span></div> : null}
      <button disabled={busy} className="btn w-full bg-[#2D89EF] text-white border-none hover:brightness-110 mb-3" type="button" onClick={() => void handleOAuthBind()}>{busy ? '跳转中...' : '使用 Bangumi 一键授权绑定'}</button>
      <div className="divider text-xs text-base-content/40">或粘贴 Token</div>
      <form className="flex flex-col gap-3" onSubmit={handleBind}><input value={bangumiToken} onChange={event => setBangumiToken(event.target.value)} type="password" placeholder="粘贴 Bangumi Access Token" className="input input-bordered w-full" /><button type="submit" disabled={busy || !bangumiToken.trim()} className="btn btn-primary w-full">{busy ? '绑定中...' : '立即绑定'}</button></form>
      <p className="text-xs text-center mt-3 text-base-content/40">前往 <a href="https://next.bgm.tv/demo/access-token" target="_blank" rel="noreferrer" className="link link-primary">next.bgm.tv/demo/access-token</a> 获取 Token</p>
      <div className="divider text-xs text-base-content/30 my-3">或</div>
      <Link href={`/login?redirect=${encodeURIComponent(returnUrl)}`} className="block text-center text-sm text-base-content/60 hover:text-primary transition-colors" onClick={close}>切换为 Bangumi 直登</Link>
    </div>
  </div>
}
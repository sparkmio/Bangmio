'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ApiResult, User } from '@/lib/types'

const KEYS = {
  bangmioToken: 'bangmio_token',
  bangmioUser: 'bangmio_user',
  bgmToken: 'bgm_token_cached',
  bgmProfile: 'bgm_user_profile',
  bangumiToken: 'bangumi_token',
  bangumiUser: 'bangumi_user'
} as const

type AuthKind = 'bangmio' | 'bangumi'
type RequestOptions = { authenticate?: boolean; retry?: boolean }
type AuthContextValue = {
  ready: boolean
  token: string
  bgmToken: string
  user: User | null
  account: User | null
  kind: AuthKind | null
  isAuthenticated: boolean
  isBangmioUser: boolean
  isBound: boolean
  setAuth: (token: string, user: User, kind?: AuthKind) => void
  refreshBangmioToken: () => Promise<string | null>
  fetchBgmToken: () => Promise<string | null>
  fetchBgmUserProfile: () => Promise<User | null>
  request: <T>(path: string, init?: RequestInit, options?: RequestOptions) => Promise<ApiResult<T>>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readJson<T>(value: string | null): T | null {
  try { return value ? JSON.parse(value) : null } catch { return null }
}

function migrateLegacyStorage() {
  const legacyToken = localStorage.getItem(KEYS.bangmioToken)
  if (legacyToken && legacyToken.split('.').length !== 3) {
    if (!localStorage.getItem(KEYS.bangumiToken)) localStorage.setItem(KEYS.bangumiToken, legacyToken)
    localStorage.removeItem(KEYS.bangmioToken)
  }
  const legacyUser = readJson<User>(localStorage.getItem(KEYS.bangmioUser))
  if (legacyUser && !legacyUser.email) {
    if (!localStorage.getItem(KEYS.bangumiUser)) localStorage.setItem(KEYS.bangumiUser, JSON.stringify(legacyUser))
    localStorage.removeItem(KEYS.bangmioUser)
  }
}

function apiPath(path: string) { return path.startsWith('/api/') ? path : `/api/v1${path}` }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState('')
  const [bgmToken, setBgmToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [account, setAccount] = useState<User | null>(null)
  const [kind, setKind] = useState<AuthKind | null>(null)
  const refreshPromise = useRef<Promise<string | null> | null>(null)

  const persistBgmToken = useCallback((nextToken: string) => {
    if (nextToken) localStorage.setItem(KEYS.bgmToken, nextToken)
    else localStorage.removeItem(KEYS.bgmToken)
    setBgmToken(nextToken)
  }, [])

  const fetchBgmToken = useCallback(async () => {
    const jwt = localStorage.getItem(KEYS.bangmioToken) || ''
    if (!jwt) return null
    const response = await fetch(apiPath('/auth/bgm-token'), { headers: { Accept: 'application/json', Authorization: `Bearer ${jwt}` } })
    const payload = await response.json().catch(() => ({})) as ApiResult<{ bgmToken?: string }>
    if (!response.ok || !payload.data?.bgmToken) return null
    persistBgmToken(payload.data.bgmToken)
    return payload.data.bgmToken
  }, [persistBgmToken])

  const fetchBgmUserProfile = useCallback(async () => {
    const jwt = localStorage.getItem(KEYS.bangmioToken) || ''
    let currentBgmToken = localStorage.getItem(KEYS.bgmToken) || ''
    if (!jwt) return null
    if (!currentBgmToken) currentBgmToken = await fetchBgmToken() || ''
    if (!currentBgmToken) return null
    const response = await fetch(apiPath('/user/me'), { headers: { Accept: 'application/json', Authorization: `Bearer ${currentBgmToken}` } })
    const payload = await response.json().catch(() => ({})) as ApiResult<User>
    if (!response.ok || !payload.data?.username) return null
    localStorage.setItem(KEYS.bgmProfile, JSON.stringify(payload.data))
    setUser(payload.data)
    return payload.data
  }, [fetchBgmToken])

  const refreshBangmioToken = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current
    refreshPromise.current = (async () => {
      const current = localStorage.getItem(KEYS.bangmioToken) || ''
      if (!current) return null
      const response = await fetch(apiPath('/auth/refresh'), { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${current}` } })
      const payload = await response.json().catch(() => ({})) as ApiResult<{ token?: string; user?: User }>
      if (!response.ok || !payload.data?.token) return null
      localStorage.setItem(KEYS.bangmioToken, payload.data.token)
      if (payload.data.user) localStorage.setItem(KEYS.bangmioUser, JSON.stringify(payload.data.user))
      setToken(payload.data.token)
      if (payload.data.user) setAccount(payload.data.user)
      await fetchBgmToken()
      return payload.data.token
    })().finally(() => { refreshPromise.current = null })
    return refreshPromise.current
  }, [fetchBgmToken])

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}, options: RequestOptions = {}) => {
    const authenticate = options.authenticate !== false
    const currentKind = kind
    const currentToken = currentKind === 'bangmio' ? (bgmToken || localStorage.getItem(KEYS.bgmToken) || '') : token
    const currentUser = user
    const perform = async (accessToken: string) => {
      const headers = new Headers(init.headers)
      headers.set('Accept', 'application/json')
      if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      if (authenticate && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
      if (authenticate && currentUser?.username) headers.set('X-Bangumi-Username', String(currentUser.username))
      const response = await fetch(apiPath(path), { ...init, headers })
      const payload = await response.json().catch(() => ({})) as ApiResult<T>
      if (!response.ok) {
        const error = new Error(payload.error || `请求失败 (${response.status})`) as Error & { status?: number }
        error.status = response.status
        throw error
      }
      return payload
    }
    try {
      return await perform(currentToken)
    } catch (error) {
      if (authenticate && options.retry !== false && currentKind === 'bangmio' && (error as { status?: number }).status === 401) {
        const refreshed = await refreshBangmioToken()
        if (refreshed) return perform(localStorage.getItem(KEYS.bgmToken) || '')
      }
      throw error
    }
  }, [bgmToken, kind, refreshBangmioToken, token, user])

  const setAuth = useCallback((nextToken: string, nextUser: User, nextKind: AuthKind = 'bangmio') => {
    if (nextKind === 'bangmio') {
      localStorage.setItem(KEYS.bangmioToken, nextToken)
      localStorage.setItem(KEYS.bangmioUser, JSON.stringify(nextUser))
      localStorage.removeItem(KEYS.bangumiToken)
      localStorage.removeItem(KEYS.bangumiUser)
      setAccount(nextUser)
      setToken(nextToken)
      setKind('bangmio')
      setUser(readJson<User>(localStorage.getItem(KEYS.bgmProfile)) || nextUser)
    } else {
      localStorage.setItem(KEYS.bangumiToken, nextToken)
      localStorage.setItem(KEYS.bangumiUser, JSON.stringify(nextUser))
      localStorage.removeItem(KEYS.bangmioToken)
      localStorage.removeItem(KEYS.bangmioUser)
      localStorage.removeItem(KEYS.bgmToken)
      localStorage.removeItem(KEYS.bgmProfile)
      setToken(nextToken)
      setBgmToken(nextToken)
      setAccount(null)
      setKind('bangumi')
      setUser(nextUser)
    }
  }, [])

  const logout = useCallback(() => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key))
    localStorage.removeItem('bangmio_oauth_flow')
    setToken(''); setBgmToken(''); setUser(null); setAccount(null); setKind(null)
  }, [])

  useEffect(() => {
    migrateLegacyStorage()
    const storedBangmioToken = localStorage.getItem(KEYS.bangmioToken) || ''
    const storedBangumiToken = localStorage.getItem(KEYS.bangumiToken) || ''
    if (storedBangmioToken) {
      const storedAccount = readJson<User>(localStorage.getItem(KEYS.bangmioUser))
      setKind('bangmio'); setToken(storedBangmioToken); setAccount(storedAccount)
      setBgmToken(localStorage.getItem(KEYS.bgmToken) || '')
      setUser(readJson<User>(localStorage.getItem(KEYS.bgmProfile)) || storedAccount)
      void (async () => { await fetchBgmToken(); await fetchBgmUserProfile() })()
    } else if (storedBangumiToken) {
      const directUser = readJson<User>(localStorage.getItem(KEYS.bangumiUser))
      setKind('bangumi'); setToken(storedBangumiToken); setBgmToken(storedBangumiToken); setUser(directUser)
    }
    setReady(true)
  }, [fetchBgmToken, fetchBgmUserProfile])

  const value = useMemo<AuthContextValue>(() => ({
    ready, token, bgmToken, user, account, kind, isAuthenticated: Boolean(token), isBangmioUser: kind === 'bangmio', isBound: kind === 'bangumi' || Boolean(account?.bgmUid || bgmToken), setAuth, refreshBangmioToken, fetchBgmToken, fetchBgmUserProfile, request, logout
  }), [account, bgmToken, fetchBgmToken, fetchBgmUserProfile, kind, logout, ready, refreshBangmioToken, request, setAuth, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

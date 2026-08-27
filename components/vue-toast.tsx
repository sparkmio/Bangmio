'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType }
type ToastContextValue = { show: (message: string, type?: ToastType, duration?: number) => void; success: (message: string) => void; error: (message: string) => void; info: (message: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null)
let nextToastId = 0

export function VueToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const toast = { id: ++nextToastId, message, type }
    setToasts(current => [...current, toast])
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== toast.id)), duration)
  }, [])
  const value = useMemo(() => ({ show, success: (message: string) => show(message, 'success'), error: (message: string) => show(message, 'error'), info: (message: string) => show(message, 'info') }), [show])
  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">{toasts.map(toast => <div key={toast.id} className={`alert shadow-lg text-sm min-w-60 ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}><span>{toast.message}</span></div>)}</div></ToastContext.Provider>
}

export function useVueToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useVueToast must be used inside VueToastProvider')
  return context
}
'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal supplies focus containment, inert background and Escape handling. */
export function Modal({
  title,
  onClose,
  children,
  className
}: {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => {
      dialog?.close()
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={className ? `bm-modal ${className}` : 'bm-modal'}
      aria-label={title}
      onCancel={onClose}
    >
      {children}
    </dialog>
  )
}

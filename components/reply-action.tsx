'use client'

import { useCallback } from 'react'

type ReplyActionProps = {
  author: string
  floor?: string | number
}

export function ReplyAction({ author, floor }: ReplyActionProps) {
  const handleClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('bangmio:reply-target', { detail: { author, floor } }))
    document
      .getElementById('reply-composer')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [author, floor])

  return (
    <button
      className="reply-action"
      type="button"
      onClick={handleClick}
      aria-label={`回复 ${author}`}
    >
      回复
    </button>
  )
}

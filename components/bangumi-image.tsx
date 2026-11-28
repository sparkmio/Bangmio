'use client'

import { useState, type ComponentPropsWithoutRef } from 'react'
import { bangumiImage, bangumiImageFallback } from '@/lib/bangumi-image'

type Props = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'alt'> & { src: string; alt: string }

function ImageWithFallback({ src, alt, onError, ...props }: Props) {
  const [useFallback, setUseFallback] = useState(false)
  const fallback = bangumiImageFallback(src)

  return (
    <img
      {...props}
      src={useFallback ? fallback : src}
      alt={alt}
      onError={event => {
        if (!useFallback && fallback !== src) setUseFallback(true)
        else onError?.(event)
      }}
    />
  )
}

export function BangumiImage({ src, ...props }: Props) {
  const normalized = bangumiImage(src)
  return <ImageWithFallback key={normalized} src={normalized} {...props} />
}

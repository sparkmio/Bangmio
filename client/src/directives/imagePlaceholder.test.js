// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { vImagePlaceholder } from './imagePlaceholder.js'

function mountImage({ complete = false, naturalWidth = 0, src = '/cover.jpg' } = {}) {
  const image = document.createElement('img')
  image.setAttribute('src', src)
  Object.defineProperties(image, {
    complete: { configurable: true, value: complete },
    naturalWidth: { configurable: true, value: naturalWidth }
  })
  vImagePlaceholder.mounted(image)
  return image
}

describe('vImagePlaceholder', () => {
  it('shows a busy placeholder until the image load event fires', () => {
    const image = mountImage()

    expect(image.classList.contains('image-placeholder')).toBe(true)
    expect(image.getAttribute('aria-busy')).toBe('true')
    expect(image.dataset.imageState).toBe('loading')

    image.dispatchEvent(new Event('load'))

    expect(image.classList.contains('image-placeholder')).toBe(false)
    expect(image.getAttribute('aria-busy')).toBeNull()
    expect(image.dataset.imageState).toBe('ready')
  })

  it('keeps a stable placeholder state when an image fails to load', () => {
    const image = mountImage()

    image.dispatchEvent(new Event('error'))

    expect(image.classList.contains('image-placeholder')).toBe(false)
    expect(image.classList.contains('image-placeholder-error')).toBe(true)
    expect(image.dataset.imageState).toBe('error')
  })

  it('immediately resolves cached images and removes listeners on unmount', () => {
    const image = mountImage({ complete: true, naturalWidth: 120 })

    expect(image.dataset.imageState).toBe('ready')

    vImagePlaceholder.unmounted(image)
    image.dispatchEvent(new Event('error'))

    expect(image.dataset.imageState).toBe('ready')
  })
})

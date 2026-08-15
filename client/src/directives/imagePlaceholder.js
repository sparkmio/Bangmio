/**
 * Shared visual state for lazy-loaded images.
 *
 * Keeps the existing <img> markup intact while exposing a consistent skeleton
 * during loading and a stable placeholder when the resource cannot be loaded.
 */
const LOADING_CLASS = 'image-placeholder'
const ERROR_CLASS = 'image-placeholder-error'
const STATE_ATTRIBUTE = 'data-image-state'

function setReadyState(el) {
  el.classList.remove(LOADING_CLASS, ERROR_CLASS)
  el.removeAttribute('aria-busy')
  el.setAttribute(STATE_ATTRIBUTE, 'ready')
}

function setErrorState(el) {
  el.classList.remove(LOADING_CLASS)
  el.classList.add(ERROR_CLASS)
  el.removeAttribute('aria-busy')
  el.setAttribute(STATE_ATTRIBUTE, 'error')
}

function clearListeners(el) {
  if (!el._imagePlaceholderListeners) return

  const { onLoad, onError } = el._imagePlaceholderListeners
  el.removeEventListener('load', onLoad)
  el.removeEventListener('error', onError)
  delete el._imagePlaceholderListeners
}

export const vImagePlaceholder = {
  mounted(el) {
    const onLoad = () => setReadyState(el)
    const onError = () => setErrorState(el)

    el.classList.add(LOADING_CLASS)
    el.setAttribute('aria-busy', 'true')
    el.setAttribute(STATE_ATTRIBUTE, 'loading')
    el.addEventListener('load', onLoad)
    el.addEventListener('error', onError)
    el._imagePlaceholderListeners = { onLoad, onError }

    // Cached browser images may already have completed before Vue mounts it.
    if (el.complete) {
      if (el.naturalWidth > 0) onLoad()
      else if (el.getAttribute('src')) onError()
    }
  },
  unmounted(el) {
    clearListeners(el)
  }
}

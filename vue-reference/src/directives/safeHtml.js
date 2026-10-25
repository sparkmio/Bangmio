import DOMPurify from 'dompurify'

export const vSafeHtml = {
  mounted(el, binding) {
    el.innerHTML = DOMPurify.sanitize(binding.value || '')
  },
  updated(el, binding) {
    el.innerHTML = DOMPurify.sanitize(binding.value || '')
  }
}

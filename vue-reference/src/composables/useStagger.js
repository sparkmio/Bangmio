import { nextTick } from 'vue'
import { gsap } from 'gsap'

export async function animateStagger(selector, options = {}) {
  const { duration = 0.4, stagger = 0.06, y = 20, delay = 0 } = options
  await nextTick()
  const els = document.querySelectorAll(selector)
  if (!els.length) return
  gsap.from(els, { opacity: 0, y, duration, stagger, ease: 'power2.out', delay })
}

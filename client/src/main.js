import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.vue'
import router from './router'
import { vSafeHtml } from './directives/safeHtml.js'
import './assets/main.css'

gsap.registerPlugin(ScrollTrigger)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('safe-html', vSafeHtml)
app.mount('#app')

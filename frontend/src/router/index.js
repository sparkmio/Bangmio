import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import Detail from '../views/Detail.vue'
import Favorites from '../views/Favorites.vue'
import OAuthCallback from '../views/OAuthCallback.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/search',
      name: 'search',
      component: Search
    },
    {
      path: '/detail/:id',
      name: 'detail',
      component: Detail,
      props: true
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: Favorites,
      meta: { requiresAuth: true }
    },
    {
      path: '/auth/callback',
      name: 'oauth-callback',
      component: OAuthCallback
    }
  ]
})

// 路由守卫：检查登录状态
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('bangmio_token')
  
  if (to.meta.requiresAuth && !token) {
    next('/')
  } else {
    next()
  }
})

export default router
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import(/* webpackChunkName: "home" */ '../views/Home.vue')
  },
  {
    path: '/trending',
    name: 'Trending',
    component: () => import(/* webpackChunkName: "trending" */ '../views/Trending.vue')
  },
  {
    path: '/anime',
    name: 'Browse',
    component: () => import(/* webpackChunkName: "browse" */ '../views/Browse.vue')
  },
  {
    path: '/anime/:id',
    name: 'Detail',
    component: () => import(/* webpackChunkName: "anime-detail" */ '../views/Detail.vue')
  },
  {
    path: '/character/:id',
    name: 'Character',
    component: () => import(/* webpackChunkName: "character" */ '../views/Character.vue')
  },
  {
    path: '/person/:id',
    name: 'Person',
    component: () => import(/* webpackChunkName: "person" */ '../views/Person.vue')
  },
  {
    path: '/anime/:id/talkbox',
    name: 'SubjectTalkbox',
    component: () => import(/* webpackChunkName: "subject-talkbox" */ '../views/Talkbox.vue'),
    props: { type: 'subject' }
  },
  {
    path: '/anime/:id/topics',
    name: 'SubjectTopics',
    component: () => import(/* webpackChunkName: "subject-topics" */ '../views/TopicBoard.vue')
  },
  {
    path: '/person/:id/talkbox',
    name: 'PersonTalkbox',
    component: () => import(/* webpackChunkName: "person-talkbox" */ '../views/Talkbox.vue'),
    props: { type: 'person' }
  },
  {
    path: '/topic/:id',
    name: 'TopicDetail',
    component: () => import(/* webpackChunkName: "topic-detail" */ '../views/TopicDetail.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import(/* webpackChunkName: "login" */ '../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import(/* webpackChunkName: "register" */ '../views/Register.vue')
  },
  {
    path: '/login/callback',
    name: 'LoginCallback',
    component: () => import(/* webpackChunkName: "login-callback" */ '../views/LoginCallback.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import(/* webpackChunkName: "profile" */ '../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:username',
    name: 'UserProfile',
    component: () => import(/* webpackChunkName: "user-profile" */ '../views/Profile.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  },
  {
    path: '/watching',
    name: 'Watching',
    component: () => import(/* webpackChunkName: "watching" */ '../views/Watching.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups',
    name: 'Groups',
    component: () => import(/* webpackChunkName: "groups" */ '../views/Groups.vue')
  },
  {
    path: '/group/:id',
    name: 'GroupDetail',
    component: () => import(/* webpackChunkName: "group-detail" */ '../views/GroupDetail.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import(/* webpackChunkName: "settings" */ '../views/Settings.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  }
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    // 未登录：跳转登录页并带 redirect query
    if (!auth.isAuthenticated) {
      return next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    // Bangmio 用户未绑定 Bangumi：不阻止导航，通过 store 状态触发绑定弹窗
    if (auth.isBangmioUser && !auth.isBound) {
      auth.setShowBindModal(true)
    }
  }
  next()
})

export default router

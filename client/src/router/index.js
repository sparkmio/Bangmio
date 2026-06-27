import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/trending',
    name: 'Trending',
    component: () => import('../views/Trending.vue')
  },
  {
    path: '/anime',
    name: 'Browse',
    component: () => import('../views/Browse.vue')
  },
  {
    path: '/anime/:id',
    name: 'Detail',
    component: () => import('../views/Detail.vue')
  },
  {
    path: '/character/:id',
    name: 'Character',
    component: () => import('../views/Character.vue')
  },
  {
    path: '/person/:id',
    name: 'Person',
    component: () => import('../views/Person.vue')
  },
  {
    path: '/anime/:id/talkbox',
    name: 'SubjectTalkbox',
    component: () => import('../views/Talkbox.vue'),
    props: { type: 'subject' }
  },
  {
    path: '/anime/:id/topics',
    name: 'SubjectTopics',
    component: () => import('../views/TopicBoard.vue')
  },
  {
    path: '/person/:id/talkbox',
    name: 'PersonTalkbox',
    component: () => import('../views/Talkbox.vue'),
    props: { type: 'person' }
  },
  {
    path: '/topic/:id',
    name: 'TopicDetail',
    component: () => import('../views/TopicDetail.vue')
  },
  {
    path: '/schedule',
    name: 'Schedule',
    component: () => import('../views/Schedule.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/login/callback',
    name: 'LoginCallback',
    component: () => import('../views/LoginCallback.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:username',
    name: 'UserProfile',
    component: () => import('../views/Profile.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue')
  },
  {
    path: '/watching',
    name: 'Watching',
    component: () => import('../views/Watching.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
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
    const token = localStorage.getItem('bangmio_token')
    if (!token) return next('/login')
  }
  next()
})

export default router

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/gantt3/index.vue'),
    },
    {
      path: '/gantt2',
      name: 'gantt2',
      component: () => import('@/views/gantt2/index.vue'),
    },
  ],
})

export default router

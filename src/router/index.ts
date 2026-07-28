import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { clearMenuRoutes, firstDynamicMenuPath, registerMenuRoutes } from './dynamic-routes'
import { getToken } from '@/utils/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'main',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '403',
          name: 'forbidden',
          component: () => import('@/views/Forbidden.vue'),
          meta: { title: '无访问权限' },
        },
        {
          path: '404',
          name: 'not-found-inline',
          component: () => import('@/views/NotFound.vue'),
          meta: { title: '页面不存在', notFound: true },
        },
      ],
    },
    /** 未匹配到 /login、/ 主布局时的兜底（非 public：未登录先跳转登录，避免抢在动态路由注册之前命中） */
    {
      path: '/:pathMatch(.*)*',
      name: 'global-not-found',
      component: () => import('@/views/NotFound.vue'),
      meta: { title: '页面不存在', notFound: true },
    },
  ],
})

let dynamicRoutesReady = false

export function resetDynamicRoutes() {
  clearMenuRoutes(router)
  dynamicRoutesReady = false
}

router.beforeEach(async (to, _from, next) => {
  const token = getToken()
  if (to.meta.public) {
    if (token && to.path === '/login') {
      next('/')
      return
    }
    next()
    return
  }
  if (!token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (!dynamicRoutesReady) {
    try {
      const { useUserStore } = await import('@/stores/user')
      const userStore = useUserStore()
      if (!userStore.loaded) {
        await userStore.loadProfile()
      }
      registerMenuRoutes(router, userStore.menus)
      dynamicRoutesReady = true
      // 刷新时 to 会先命中 global-not-found，不能 next({ ...to })，否则会一直带着错误的 name
      next({ path: to.path, query: to.query, hash: to.hash, replace: true })
    } catch (e) {
      const { useUserStore } = await import('@/stores/user')
      const { useTabsStore } = await import('@/stores/tabs')
      const msg = (e as Error).message || ''
      if (msg.includes('禁用')) {
        ElMessage.warning('账号已禁用，请重新登录')
      }
      useUserStore().clear()
      useTabsStore().clear()
      next({ path: '/login', query: { redirect: to.fullPath } })
    }
    return
  }

  if (to.path === '/') {
    const { useUserStore } = await import('@/stores/user')
    let target = firstDynamicMenuPath(useUserStore().menus) ?? '/403'
    if (target === '/') target = '/403'
    next({ path: target, replace: true })
    return
  }

  next()
})

export default router

import type { Router, RouteRecordRaw } from 'vue-router'
import type { MenuTree } from '@/api/types'
import { flattenMenuTree } from '@/utils/menu'

/** 与数据库种子 / 菜单管理中的 component 字段一致 */
const menuComponentLoaders: Record<string, () => Promise<unknown>> = {
  'dashboard/index': () => import('@/views/Dashboard.vue'),
  'system/user/index': () => import('@/views/system/User.vue'),
  'system/role/index': () => import('@/views/system/Role.vue'),
  'system/menu/index': () => import('@/views/system/Menu.vue'),
  'system/dept/index': () => import('@/views/system/Dept.vue'),
  'system/permission/index': () => import('@/views/system/permission/index.vue'),
  'system/login-log/index': () => import('@/views/system/login-log/index.vue'),
  'system/op-log/index': () => import('@/views/system/op-log/index.vue'),
  'system/runtime-log/index': () => import('@/views/system/runtime-log/index.vue'),
}

const addedRouteNames: string[] = []

/** 主布局内未匹配到已注册菜单时的 404（需登录后由动态路由注册） */
const MAIN_404_ROUTE = 'main-404'

function normalizeNavPath(path: string): string {
  const p = path.trim()
  if (!p) return '/403'
  return p.startsWith('/') ? p : `/${p}`
}

/** 首个可动态注册的菜单路径（与 registerMenuRoutes 规则一致），用于首页重定向 */
export function firstDynamicMenuPath(menus: MenuTree[]): string | null {
  function walk(nodes: MenuTree[]): string | null {
    for (const n of nodes) {
      if (n.hidden) continue
      if (
        n.menuType === 2 &&
        n.component &&
        n.component !== 'Layout' &&
        n.path?.trim() &&
        resolveLoader(n.component)
      ) {
        return normalizeNavPath(n.path)
      }
      if (n.children?.length) {
        const found = walk(n.children)
        if (found) return found
      }
    }
    return null
  }
  return walk(menus)
}

function normalizeChildPath(path: string): string {
  const p = path.trim()
  if (p.startsWith('/')) return p.slice(1)
  return p
}

function resolveLoader(component: string): (() => Promise<unknown>) | undefined {
  return menuComponentLoaders[component]
}

/** 根据后端菜单注册可访问页面路由（目录、按钮不注册） */
export function registerMenuRoutes(router: Router, menus: MenuTree[]) {
  for (const name of addedRouteNames) {
    router.removeRoute(name)
  }
  addedRouteNames.length = 0

  const flat = flattenMenuTree(menus)
  for (const m of flat) {
    if (m.menuType !== 2 || !m.component || m.component === 'Layout') continue
    const load = resolveLoader(m.component)
    if (!load) {
      console.warn(`[router] 未配置菜单组件映射: ${m.component} (${m.name})`)
      continue
    }
    const name = `menu-${m.id}`
    const route = {
      path: normalizeChildPath(m.path),
      name,
      component: load,
      meta: { title: m.name, perms: m.perms, menuId: m.id },
    } as RouteRecordRaw
    router.addRoute('main', route)
    addedRouteNames.push(name)
  }

  router.addRoute('main', {
    path: ':pathMatch(.*)*',
    name: MAIN_404_ROUTE,
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在', notFound: true },
  } as RouteRecordRaw)
  addedRouteNames.push(MAIN_404_ROUTE)
}

export function clearMenuRoutes(router: Router) {
  for (const name of addedRouteNames) {
    router.removeRoute(name)
  }
  addedRouteNames.length = 0
}

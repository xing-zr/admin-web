import type { AdminMenu, MenuTree } from '@/api/types'

/** 将后端返回的菜单树拍平为一维列表（顺序：深度优先） */
export function flattenMenuTree(nodes: MenuTree[]): AdminMenu[] {
  const out: AdminMenu[] = []
  function walk(ns: MenuTree[]) {
    for (const n of ns) {
      out.push({
        id: n.id,
        parentId: n.parentId,
        name: n.name,
        path: n.path,
        component: n.component,
        redirect: n.redirect,
        icon: n.icon,
        sort: n.sort,
        hidden: n.hidden,
        perms: n.perms,
        menuType: n.menuType,
      })
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

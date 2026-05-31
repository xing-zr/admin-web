import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TabItem {
  path: string
  title: string
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>([])

  function normalizePath(path: string) {
    return path.split('?')[0] || '/'
  }

  function addTab(item: TabItem) {
    const path = normalizePath(item.path)
    if (!path || path === '/login') return
    const title = item.title || '未命名'
    const exists = tabs.value.some((t) => t.path === path)
    if (!exists) {
      tabs.value.push({ path, title })
    } else {
      const tab = tabs.value.find((t) => t.path === path)
      if (tab && tab.title !== title) tab.title = title
    }
  }

  /** 关闭标签；返回应跳转的路径，null 表示不跳转 */
  function removeTab(path: string, activePath: string): string | null {
    const p = normalizePath(path)
    const i = tabs.value.findIndex((t) => t.path === p)
    if (i === -1) return null

    const wasActive = normalizePath(activePath) === p
    tabs.value.splice(i, 1)

    if (tabs.value.length === 0) {
      tabs.value.push({ path: '/', title: '首页' })
      return wasActive ? '/' : null
    }

    if (!wasActive) return null

    const next = tabs.value[Math.min(i, tabs.value.length - 1)]
    return next?.path ?? '/'
  }

  return { tabs, addTab, removeTab, normalizePath }
})

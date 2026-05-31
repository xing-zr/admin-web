import type { App, Directive } from 'vue'
import { watch } from 'vue'
import { useUserStore } from '@/stores/user'

type PermValue = string | string[]

function check(value: PermValue | undefined): boolean {
  const store = useUserStore()
  if (store.superAdmin) return true
  if (!value) return true
  if (Array.isArray(value)) {
    return value.some((c) => store.permissions.includes(c))
  }
  return store.permissions.includes(value)
}

function apply(el: HTMLElement, value: PermValue | undefined) {
  el.style.display = check(value) ? '' : 'none'
}

const permissionDirective: Directive<HTMLElement, PermValue> = {
  mounted(el, binding) {
    const store = useUserStore()
    apply(el, binding.value)
    watch(
      () => [store.permissions, store.superAdmin] as const,
      () => apply(el, binding.value),
      { deep: true },
    )
  },
  updated(el, binding) {
    apply(el, binding.value)
  },
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}

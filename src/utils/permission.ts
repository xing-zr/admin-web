import { useUserStore } from '@/stores/user'

export function hasPerm(code: string): boolean {
  const store = useUserStore()
  if (store.superAdmin) return true
  if (!code) return true
  return store.permissions.includes(code)
}

export function hasAnyPerm(...codes: string[]): boolean {
  return codes.some((c) => hasPerm(c))
}

export function hasAllPerm(...codes: string[]): boolean {
  return codes.every((c) => hasPerm(c))
}

/** 从权限标识推导模块，如 system:user:list → system:user */
export function moduleFromPermCode(code: string): string {
  if (!code) return ''
  const i = code.lastIndexOf(':')
  return i > 0 ? code.slice(0, i) : code
}

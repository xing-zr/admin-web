import { defineStore } from 'pinia'
import { profile } from '@/api/auth'
import type { LoginUser, MenuTree } from '@/api/types'
import { resetDynamicRoutes } from '@/router'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as LoginUser | null,
    menus: [] as MenuTree[],
    permissions: [] as string[],
    superAdmin: false,
    loaded: false,
  }),
  getters: {
    hasPerm: (state) => (code: string) =>
      state.superAdmin || !code || state.permissions.includes(code),
    hasAnyPerm: (state) => (...codes: string[]) =>
      state.superAdmin || codes.some((c) => state.permissions.includes(c)),
  },
  actions: {
    setFromLogin(
      user: LoginUser,
      menus: MenuTree[],
      permissions: string[] = [],
      superAdmin = false,
    ) {
      this.user = user
      this.menus = menus
      this.permissions = permissions
      this.superAdmin = superAdmin
      this.loaded = true
    },
    clear() {
      this.user = null
      this.menus = []
      this.permissions = []
      this.superAdmin = false
      this.loaded = false
      localStorage.removeItem('token')
      resetDynamicRoutes()
    },
    async loadProfile() {
      const data = await profile()
      this.user = data.user
      this.menus = data.menus
      this.permissions = data.permissions ?? []
      this.superAdmin = data.superAdmin ?? false
      this.loaded = true
    },
  },
})

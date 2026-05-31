import http from './http'
import type {
  AdminDept,
  AdminMenu,
  AdminRole,
  AdminUser,
  LoginLog,
  MenuTree,
  OpLog,
  PageResult,
  RuntimeLogChunk,
  RuntimeLogEntry,
  RuntimeLogFile,
} from './types'

export async function fetchUsers(params: { page?: number; pageSize?: number; keyword?: string }) {
  const res = await http.get('/admin/users', { params })
  return res.data as PageResult<AdminUser>
}

export async function getUser(id: number) {
  const res = await http.get(`/admin/users/${id}`)
  return res.data as AdminUser
}

export async function createUser(data: {
  username: string
  password?: string
  nickname?: string
  avatar?: string
  status?: number
  deptId?: number
  roleIds?: number[]
}) {
  await http.post('/admin/users', data)
}

export async function updateUser(
  id: number,
  data: {
    password?: string
    nickname?: string
    avatar?: string
    status?: number
    deptId?: number
    roleIds?: number[]
  },
) {
  await http.put(`/admin/users/${id}`, data)
}

export async function deleteUser(id: number) {
  await http.delete(`/admin/users/${id}`)
}

export async function deptsTree() {
  const res = await http.get('/admin/depts')
  return res.data as AdminDept[]
}

export async function deptsAll() {
  const res = await http.get('/admin/depts/all')
  return res.data as AdminDept[]
}

export async function getDept(id: number) {
  const res = await http.get(`/admin/depts/${id}`)
  return res.data as AdminDept
}

export async function createDept(data: {
  parentId?: number
  name: string
  sort?: number
  status?: number
  remark?: string
}) {
  await http.post('/admin/depts', data)
}

export async function updateDept(
  id: number,
  data: {
    parentId?: number
    name: string
    sort?: number
    status?: number
    remark?: string
  },
) {
  await http.put(`/admin/depts/${id}`, data)
}

export async function deleteDept(id: number) {
  await http.delete(`/admin/depts/${id}`)
}

export async function fetchRoles(params: { page?: number; pageSize?: number; keyword?: string }) {
  const res = await http.get('/admin/roles', { params })
  return res.data as PageResult<AdminRole>
}

export async function rolesAll() {
  const res = await http.get('/admin/roles/all')
  return res.data as AdminRole[]
}

export async function getRole(id: number) {
  const res = await http.get(`/admin/roles/${id}`)
  return res.data as AdminRole
}

export async function permissionsTree() {
  const res = await http.get('/admin/permissions/tree')
  return res.data as import('./types').PermissionModuleTree[]
}

export async function permissionsAll() {
  const res = await http.get('/admin/permissions/all')
  return res.data as import('./types').AdminPermission[]
}

export async function fetchPermissions(params: {
  page?: number
  pageSize?: number
  keyword?: string
  module?: string
}) {
  const res = await http.get('/admin/permissions', { params })
  return res.data as PageResult<import('./types').AdminPermission>
}

export async function getPermission(id: number) {
  const res = await http.get(`/admin/permissions/${id}`)
  return res.data as import('./types').AdminPermission
}

export async function createPermission(data: {
  code: string
  name: string
  menuId?: number
  module?: string
  permType?: number
  status?: number
  sort?: number
  remark?: string
}) {
  await http.post('/admin/permissions', data)
}

export async function updatePermission(
  id: number,
  data: {
    code: string
    name: string
    menuId?: number
    module?: string
    permType?: number
    status?: number
    sort?: number
    remark?: string
  },
) {
  await http.put(`/admin/permissions/${id}`, data)
}

export async function deletePermission(id: number) {
  await http.delete(`/admin/permissions/${id}`)
}

export async function fetchAPIs(params: {
  page?: number
  pageSize?: number
  keyword?: string
  method?: string
  permissionId?: number
}) {
  const res = await http.get('/admin/apis', { params })
  return res.data as PageResult<import('./types').AdminAPI>
}

export async function getAPI(id: number) {
  const res = await http.get(`/admin/apis/${id}`)
  return res.data as import('./types').AdminAPI
}

export async function createAPI(data: {
  method: string
  pathPattern: string
  permissionId: number
  name: string
  status?: number
}) {
  await http.post('/admin/apis', data)
}

export async function updateAPI(
  id: number,
  data: {
    method: string
    pathPattern: string
    permissionId: number
    name: string
    status?: number
  },
) {
  await http.put(`/admin/apis/${id}`, data)
}

export async function deleteAPI(id: number) {
  await http.delete(`/admin/apis/${id}`)
}

export async function reloadAPIRoutes() {
  await http.post('/admin/apis/reload')
}

export async function createRole(data: {
  name: string
  code: string
  remark?: string
  status?: number
  permissionIds?: number[]
  menuIds?: number[]
}) {
  await http.post('/admin/roles', data)
}

export async function updateRole(
  id: number,
  data: {
    name: string
    code: string
    remark?: string
    status?: number
    permissionIds?: number[]
    menuIds?: number[]
  },
) {
  await http.put(`/admin/roles/${id}`, data)
}

export async function deleteRole(id: number) {
  await http.delete(`/admin/roles/${id}`)
}

/** 完整菜单树（与 GET /admin/menus、/admin/menus/tree 一致） */
export async function menusTree() {
  const res = await http.get('/admin/menus')
  return res.data as MenuTree[]
}

/** 菜单扁平列表（仅统计等场景；管理页请用树形 menusTree + flattenMenuTree） */
export async function menusFlat() {
  const res = await http.get('/admin/menus/flat')
  return res.data as AdminMenu[]
}

export async function getMenu(id: number) {
  const res = await http.get(`/admin/menus/${id}`)
  return res.data as AdminMenu
}

export async function createMenu(data: Record<string, unknown>) {
  await http.post('/admin/menus', data)
}

export async function updateMenu(id: number, data: Record<string, unknown>) {
  await http.put(`/admin/menus/${id}`, data)
}

export async function deleteMenu(id: number) {
  await http.delete(`/admin/menus/${id}`)
}

export async function fetchLoginLogs(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}) {
  const res = await http.get('/admin/login-logs', { params })
  return res.data as PageResult<LoginLog>
}

export async function fetchOpLogs(params: { page?: number; pageSize?: number; keyword?: string }) {
  const res = await http.get('/admin/op-logs', { params })
  return res.data as PageResult<OpLog>
}

export async function fetchRuntimeLogList(path?: string) {
  const res = await http.get('/admin/runtime-logs', { params: { path: path || undefined } })
  return res.data as { items: RuntimeLogEntry[]; root: string }
}

/** 旧版：无 mode，整文件或末尾 512KB */
export async function fetchRuntimeLogContentLegacy(path: string) {
  const res = await http.get('/admin/runtime-logs/content', { params: { path } })
  return res.data as RuntimeLogFile
}

export async function fetchRuntimeLogChunk(params: {
  path: string
  mode: 'lines' | 'tail' | 'tail_older' | 'bytes'
  startLine?: number
  lineLimit?: number
  beforeByte?: number
  byteOffset?: number
  byteLimit?: number
}) {
  const res = await http.get('/admin/runtime-logs/content', {
    params: {
      path: params.path,
      mode: params.mode,
      startLine: params.startLine,
      lineLimit: params.lineLimit,
      beforeByte: params.beforeByte,
      byteOffset: params.byteOffset,
      byteLimit: params.byteLimit,
    },
  })
  return res.data as RuntimeLogChunk
}

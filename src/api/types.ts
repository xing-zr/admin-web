export interface MenuTree {
  id: number
  parentId: number
  name: string
  path: string
  component: string
  redirect: string
  icon: string
  sort: number
  hidden: boolean
  perms: string
  menuType: number
  children?: MenuTree[]
}

export interface LoginUser {
  id: number
  username: string
  nickname: string
  avatar: string
  status: number
}

export interface LoginResult {
  token: string
  refreshToken?: string
  user: LoginUser
  menus: MenuTree[]
  permissions: string[]
  superAdmin?: boolean
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface AdminUser {
  id: number
  username: string
  nickname: string
  avatar: string
  status: number
  deptId?: number
  dept?: { id: number; name: string }
  roles?: { id: number; name: string; code: string }[]
}

export interface AdminDept {
  id: number
  parentId: number
  name: string
  sort: number
  status: number
  remark: string
  children?: AdminDept[]
}

export interface AdminRole {
  id: number
  name: string
  code: string
  remark: string
  status: number
  menus?: { id: number; name: string }[]
  permissions?: { id: number; code: string; name: string }[]
}

export interface PermissionItem {
  id: number
  code: string
  name: string
  module: string
  permType: number
  sort: number
}

export interface PermissionModuleTree {
  module: string
  moduleLabel: string
  permissions: PermissionItem[]
}

export interface AdminPermission {
  id: number
  code: string
  name: string
  module: string
  permType: number
  status: number
  sort: number
  remark: string
}

export interface AdminAPI {
  id: number
  method: string
  pathPattern: string
  permissionId: number
  name: string
  status: number
  permission?: { id: number; code: string; name: string }
}

export interface AdminMenu {
  id: number
  parentId: number
  name: string
  path: string
  component: string
  redirect: string
  icon: string
  sort: number
  hidden: boolean
  perms: string
  menuType: number
}

export interface LoginLog {
  id: number
  adminUserId: number
  username: string
  ip: string
  userAgent: string
  status: number
  msg: string
  createdAt: string
}

export interface OpLog {
  id: number
  adminUserId: number
  username: string
  method: string
  path: string
  ip: string
  userAgent: string
  requestBody: string
  statusCode: number
  latencyMs: number
  createdAt: string
}

export interface RuntimeLogEntry {
  name: string
  path: string
  isDir: boolean
  size: number
  modTime: string
}

/** 兼容旧版整段读取 */
export interface RuntimeLogFile {
  path: string
  size: number
  content: string
  truncated: boolean
}

/** 分页读取（lines | tail | tail_older | bytes | legacy） */
export interface RuntimeLogChunk {
  path: string
  size: number
  mode: string
  content: string
  startLine?: number
  lineCount?: number
  hasMoreBefore?: boolean
  hasMoreAfter?: boolean
  rangeStartByte?: number
  rangeEndByte?: number
  byteOffset?: number
  byteLength?: number
  nextByteOffset?: number
  byteEof?: boolean
  truncated?: boolean
}

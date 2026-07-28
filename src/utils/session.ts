export const TOKEN_KEY = 'token'
export const REFRESH_TOKEN_KEY = 'refreshToken'

export function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** 仅允许站内相对路径，防止开放重定向 */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

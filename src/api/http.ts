import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import {
  getApiBase,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
} from '@/utils/session'

const http = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
})

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export type HttpError = Error & { status?: number; handled?: boolean }

let refreshPromise: Promise<string | null> | null = null

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type ApiBody = { code: number; message: string; data: unknown }

function clearSessionOnUnauthorized() {
  void Promise.all([import('@/stores/user'), import('@/stores/tabs')]).then(
    ([{ useUserStore }, { useTabsStore }]) => {
      useUserStore().clear()
      useTabsStore().clear()
    },
  )
}

function rejectHttp(status: number | undefined, msg: string, handled = false): Promise<never> {
  const err = new Error(msg) as HttpError
  err.status = status
  err.handled = handled
  return Promise.reject(err)
}

async function tryRefreshToken(): Promise<string | null> {
  const stored = getRefreshToken()
  if (!stored) return null
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await axios.post<ApiBody>(
        `${getApiBase()}/auth/refresh`,
        { refreshToken: stored },
        { timeout: 30000 },
      )
      const body = res.data
      if (body.code !== 0 || !body.data || typeof body.data !== 'object') return null
      const data = body.data as { token?: string; refreshToken?: string }
      if (!data.token) return null
      setToken(data.token)
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken)
      }
      return data.token
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

http.interceptors.response.use(
  (res: AxiosResponse<ApiBody>) => {
    const body = res.data
    if (body.code !== 0) {
      return rejectHttp(undefined, body.message || '请求失败')
    }
    return { ...res, data: body.data } as AxiosResponse<unknown>
  },
  async (err: {
    response?: { status?: number; data?: { message?: string }; config?: RetryConfig }
    config?: RetryConfig
    message?: string
  }) => {
    const config = err.config ?? err.response?.config
    const reqUrl = config?.url || ''
    const status = err.response?.status
    const serverMsg = err.response?.data?.message
    const isLoginRequest = reqUrl.includes('/auth/login')
    const isRefreshRequest = reqUrl.includes('/auth/refresh')

    if (status === 429) {
      return rejectHttp(429, '请求过于频繁，请稍后再试', true)
    }

    if (status === 401 && !isLoginRequest && !isRefreshRequest && config && !config._retry) {
      const newToken = await tryRefreshToken()
      if (newToken) {
        config._retry = true
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${newToken}`
        return http.request(config)
      }
      const msg =
        serverMsg?.includes('禁用') ? '账号已禁用，请重新登录' : '登录已过期，请重新登录'
      ElMessage.warning(msg)
      const path = router.currentRoute.value.fullPath
      clearSessionOnUnauthorized()
      if (router.currentRoute.value.path !== '/login') {
        const redirect = path.startsWith('/login') ? undefined : path
        router.push(redirect ? { path: '/login', query: { redirect } } : { path: '/login' })
      }
      return rejectHttp(401, msg, true)
    }

    if (status === 403) {
      ElMessage.error(serverMsg || '无操作权限')
      return rejectHttp(403, serverMsg || '无操作权限', true)
    }

    const msg = serverMsg || err.message || '网络错误'
    return rejectHttp(status, msg)
  },
)

export default http

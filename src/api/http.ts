import axios, { type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type ApiBody = { code: number; message: string; data: unknown }

http.interceptors.response.use(
  (res: AxiosResponse<ApiBody>) => {
    const body = res.data
    if (body.code !== 0) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return { ...res, data: body.data } as AxiosResponse<unknown>
  },
  (err: { response?: { status?: number; data?: { message?: string }; config?: { url?: string } }; message?: string }) => {
    const reqUrl = err.response?.config?.url || ''
    const isLoginRequest = reqUrl.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      const path = router.currentRoute.value.fullPath
      router.push({ path: '/login', query: { redirect: path } })
    }
    if (err.response?.status === 403) {
      ElMessage.error(err.response?.data?.message || '无操作权限')
    }
    const msg = err.response?.data?.message || err.message || '网络错误'
    return Promise.reject(new Error(msg))
  },
)

export default http

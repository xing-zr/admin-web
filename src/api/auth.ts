import http from './http'
import type { LoginResult } from './types'

export async function fetchCaptcha() {
  const res = await http.get('/auth/captcha')
  return res.data as { captchaId: string; imageBase64: string }
}

export async function login(
  username: string,
  password: string,
  captchaId: string,
  captchaCode: string,
) {
  const res = await http.post('/auth/login', { username, password, captchaId, captchaCode })
  return res.data as LoginResult
}

export async function profile() {
  const res = await http.get('/auth/profile')
  return res.data as LoginResult
}

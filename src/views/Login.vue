<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Key, User, Lock } from '@element-plus/icons-vue'
import { fetchCaptcha, login } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)
const captchaLoading = ref(false)
const captchaImage = ref('')

const form = reactive({
  username: 'admin',
  password: 'admin123',
  captchaId: '',
  captchaCode: '',
})

async function loadCaptcha() {
  captchaLoading.value = true
  try {
    const data = await fetchCaptcha()
    form.captchaId = data.captchaId
    captchaImage.value = data.imageBase64
    form.captchaCode = ''
  } catch (e) {
    ElMessage.error((e as Error).message || '获取验证码失败')
  } finally {
    captchaLoading.value = false
  }
}

async function onSubmit() {
  if (loading.value) return
  if (!form.captchaCode.trim()) {
    ElMessage.warning('请输入验证码')
    return
  }
  loading.value = true
  try {
    const data = await login(form.username, form.password, form.captchaId, form.captchaCode.trim())
    localStorage.setItem('token', data.token)
    userStore.setFromLogin(data.user, data.menus, data.permissions ?? [], data.superAdmin ?? false)
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (e) {
    ElMessage.error((e as Error).message)
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCaptcha()
})
</script>

<template>
  <div class="login-page">
    <div class="bg" aria-hidden="true" />
    <div class="noise" aria-hidden="true" />
    <div class="orb orb-a" aria-hidden="true" />
    <div class="orb orb-b" aria-hidden="true" />
    <div class="grid" aria-hidden="true" />
    <div class="diagonal-accent" aria-hidden="true" />

    <div class="login-card login-card-anim">
      <div class="card-edge" aria-hidden="true" />
      <div class="card-head">
        <div class="logo">
          <el-icon :size="26"><Key /></el-icon>
        </div>
        <h1 class="h1 font-display">欢迎回来</h1>
        <p class="sub">使用账号登录管理后台</p>
      </div>

      <el-form :model="form" class="form" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" size="large" autocomplete="username" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            autocomplete="current-password"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="captcha-row">
            <el-input
              v-model="form.captchaCode"
              size="large"
              maxlength="8"
              placeholder=""
              autocomplete="off"
              class="captcha-input"
            />
            <div
              class="captcha-img-wrap"
              title="点击换一张"
              role="button"
              tabindex="0"
              @click="loadCaptcha"
              @keydown.enter.prevent="loadCaptcha"
            >
              <img v-if="captchaImage" :src="captchaImage" alt="验证码，点击换一张" class="captcha-img" />
              <span v-else class="captcha-placeholder">{{ captchaLoading ? '加载中…' : '点击获取' }}</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item class="submit-wrap">
          <el-button
            class="submit"
            type="primary"
            size="large"
            native-type="submit"
            :loading="loading"
          >
            {{ loading ? '登录中…' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- <p class="foot">JWT 鉴权 · 前后端分离</p> -->
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    #040711 0%,
    #0a1022 24%,
    #0f1a3d 48%,
    #152454 72%,
    #080c18 100%
  );
  background-size: 240% 240%;
  animation: gradient-shift 26s ease infinite;
}

.noise {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  animation: float-orb 14s ease-in-out infinite;
}

.orb-a {
  width: min(56vw, 460px);
  height: min(56vw, 460px);
  top: -14%;
  left: -12%;
  background: radial-gradient(circle at 35% 35%, rgba(29, 78, 216, 0.52), transparent 62%);
  animation-delay: -2s;
}

.orb-b {
  width: min(50vw, 400px);
  height: min(50vw, 400px);
  bottom: -18%;
  right: -12%;
  background: radial-gradient(circle at 65% 55%, rgba(245, 158, 11, 0.38), transparent 58%);
  animation-delay: -5s;
}

.grid {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: radial-gradient(ellipse 75% 65% at 50% 45%, black 22%, transparent 72%);
  animation: pulse-glow 11s ease-in-out infinite;
}

.diagonal-accent {
  position: absolute;
  top: -20%;
  right: -30%;
  width: min(70vw, 520px);
  height: 140%;
  background: linear-gradient(
    155deg,
    transparent 40%,
    rgba(29, 78, 216, 0.09) 48%,
    rgba(245, 158, 11, 0.06) 58%,
    transparent 68%
  );
  pointer-events: none;
  transform: rotate(-8deg);
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 428px;
  padding: 34px 34px 28px;
  border-radius: 22px;
  background: rgba(252, 253, 253, 0.94);
  backdrop-filter: blur(20px) saturate(1.15);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    0 2px 4px rgba(8, 12, 20, 0.04),
    0 28px 64px -16px rgba(8, 12, 20, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  overflow: hidden;
}

.card-edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(29, 78, 216, 0.14);
  background: linear-gradient(
    135deg,
    rgba(29, 78, 216, 0.07) 0%,
    transparent 42%,
    transparent 58%,
    rgba(245, 158, 11, 0.06) 100%
  );
}

.card-head {
  position: relative;
  text-align: center;
  margin-bottom: 8px;
}

.logo {
  width: 54px;
  height: 54px;
  margin: 0 auto 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(145deg, #1e40af 0%, #1d4ed8 42%, #3b82f6 78%, #d97706 175%);
  box-shadow: 0 14px 40px rgba(29, 78, 216, 0.45);
  transition: transform 0.35s var(--ease-spring);
}

.login-card:hover .logo {
  transform: scale(1.04) rotate(-2.5deg);
}

.h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0c1218;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.sub {
  margin: 0;
  font-size: 14px;
  color: #5c6b7a;
  line-height: 1.5;
}

.form {
  margin-top: 22px;
}

.form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #475569;
}

.submit-wrap {
  margin-bottom: 0;
  margin-top: 8px;
}

.submit {
  width: 100%;
  height: 44px;
  font-weight: 600;
  letter-spacing: 0.06em;
  border-radius: 12px;
  transition:
    transform 0.2s var(--ease-out),
    box-shadow 0.25s ease;
}

.submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 36px rgba(29, 78, 216, 0.38);
}

.foot {
  margin: 22px 0 0;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.captcha-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
}

.captcha-input {
  flex: 1;
  min-width: 0;
}

.captcha-img-wrap {
  flex-shrink: 0;
  width: 140px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #f8fafc;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}

.captcha-img-wrap:focus-visible {
  box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.35);
}

.captcha-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.captcha-placeholder {
  font-size: 12px;
  color: #94a3b8;
}
</style>

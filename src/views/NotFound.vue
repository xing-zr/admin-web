<script setup lang="ts">
import { useRouter } from 'vue-router'
import { HomeFilled } from '@element-plus/icons-vue'

const router = useRouter()
const authed = !!localStorage.getItem('token')

function goHome() {
  if (authed) router.replace('/')
  else router.replace('/login')
}
</script>

<template>
  <div class="not-found">
    <div class="code" aria-hidden="true">404</div>
    <h1 class="h1">页面不存在</h1>
    <p class="desc">该地址没有对应页面，请检查链接是否正确。</p>
    <el-button type="primary" :icon="HomeFilled" @click="goHome">
      {{ authed ? '返回首页' : '去登录' }}
    </el-button>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.code {
  font-size: clamp(3rem, 12vw, 5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.06em;
  color: var(--el-color-info-light-5);
  margin-bottom: 12px;
  user-select: none;
}

.h1 {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.desc {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  max-width: 380px;
  line-height: 1.5;
}
</style>

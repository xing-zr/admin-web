<script setup lang="ts">
import { useRouter } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'

const router = useRouter()

function goHome() {
  router.replace('/')
}
</script>

<template>
  <div class="forbidden">
    <el-icon class="ico" :size="56"><WarningFilled /></el-icon>
    <h1 class="h1">无访问权限</h1>
    <p class="desc">您没有权限访问该页面。如需开通权限，请联系管理员。</p>
    <el-button type="primary" @click="goHome">返回首页</el-button>
  </div>
</template>

<style scoped>
.forbidden {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.ico {
  color: var(--el-color-warning);
  margin-bottom: 16px;
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
  max-width: 360px;
  line-height: 1.5;
}
</style>

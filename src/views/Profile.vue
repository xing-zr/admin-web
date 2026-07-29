<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { changePassword } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { useTabsStore } from '@/stores/tabs'

const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()
const saving = ref(false)

const user = computed(() => userStore.user)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

async function onSubmit() {
  if (!form.oldPassword || !form.newPassword) {
    ElMessage.warning('请填写完整')
    return
  }
  if (form.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  saving.value = true
  try {
    await changePassword(form.oldPassword, form.newPassword)
    ElMessage.success('密码已修改，请重新登录')
    userStore.clear()
    tabsStore.clear()
    router.push('/login')
  } catch (e) {
    ElMessage.error((e as Error).message || '修改失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-shell profile-page">
    <el-row :gutter="20">
      <el-col :xs="24" :md="10">
        <el-card class="surface-card" shadow="never">
          <template #header>
            <span class="card-title">账号信息</span>
          </template>
          <div class="info-row">
            <span class="label">用户名</span>
            <span>{{ user?.username || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">昵称</span>
            <span>{{ user?.nickname || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">状态</span>
            <el-tag :type="user?.status === 1 ? 'success' : 'danger'" size="small">
              {{ user?.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="14">
        <el-card class="surface-card" shadow="never">
          <template #header>
            <span class="card-title">修改密码</span>
          </template>
          <el-form label-width="88px" @submit.prevent="onSubmit">
            <el-form-item label="原密码">
              <el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" placeholder="至少 6 位" />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
            </el-form-item>
          </el-form>
          <p class="hint">修改成功后将退出所有登录会话，需重新登录。</p>
        </el-card>
      </el-col>
    </el-row>
    <div v-if="!user" class="empty-hint">
      <el-icon :size="32"><User /></el-icon>
      <p>未加载用户信息</p>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 960px;
}

.card-title {
  font-weight: 600;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  width: 64px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.empty-hint {
  margin-top: 48px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
</style>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as api from '@/api/admin'
import type { AdminUser } from '@/api/types'

const loading = ref(false)
const list = ref<AdminUser[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 10, keyword: '' })

const dialog = ref(false)
const saving = ref(false)
const form = reactive({
  id: 0,
  username: '',
  password: '',
  nickname: '',
  status: 1 as number,
  deptId: undefined as number | undefined,
  roleIds: [] as number[],
})

const rolesOptions = ref<{ id: number; name: string }[]>([])
const deptOptions = ref<{ id: number; label: string }[]>([])

async function load() {
  loading.value = true
  try {
    const res = await api.fetchUsers(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  const r = await api.rolesAll()
  rolesOptions.value = r.map((x) => ({ id: x.id, name: x.name }))
}

type DeptNode = { id: number; name: string; children?: DeptNode[] }

function buildDeptOptions(nodes: DeptNode[]) {
  const out: { id: number; label: string }[] = []
  const walk = (list: DeptNode[], level: number, parentPath: string) => {
    for (const n of list) {
      const fullPath = parentPath ? `${parentPath} / ${n.name}` : n.name
      const indent = '\u3000'.repeat(level)
      out.push({ id: n.id, label: `${indent}${n.name}（${fullPath}）` })
      if (n.children?.length) walk(n.children, level + 1, fullPath)
    }
  }
  walk(nodes, 0, '')
  return out
}

async function loadDepts() {
  const tree = await api.deptsTree()
  deptOptions.value = buildDeptOptions(tree)
}

function openCreate() {
  form.id = 0
  form.username = ''
  form.password = ''
  form.nickname = ''
  form.status = 1
  form.deptId = undefined
  form.roleIds = []
  dialog.value = true
}

async function openEdit(row: AdminUser) {
  const u = await api.getUser(row.id)
  form.id = u.id
  form.username = u.username
  form.password = ''
  form.nickname = u.nickname
  form.status = u.status
  form.deptId = u.deptId
  form.roleIds = (u.roles || []).map((r) => r.id)
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    if (form.id) {
      await api.updateUser(form.id, {
        nickname: form.nickname,
        password: form.password || undefined,
        status: form.status,
        deptId: form.deptId,
        roleIds: form.roleIds,
      })
    } else {
      await api.createUser({
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        status: form.status,
        deptId: form.deptId,
        roleIds: form.roleIds,
      })
    }
    ElMessage.success('保存成功')
    dialog.value = false
    await load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    saving.value = false
  }
}

async function remove(row: AdminUser) {
  await ElMessageBox.confirm(`删除用户「${row.username}」？`, '确认', { type: 'warning' })
  await api.deleteUser(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(() => {
  loadRoles()
  loadDepts()
  load()
})
</script>

<template>
  <div class="page-shell">
  <el-card class="surface-card surface-card--table" shadow="never">
    <div class="table-toolbar">
      <el-form inline @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="用户名/昵称" @keyup.enter="load" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="() => { query.page = 1; load() }">查询</el-button>
          <el-button v-permission="'system:user:create'" @click="openCreate">
            <el-icon class="el-icon--left"><Plus /></el-icon>
            新建
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table v-loading="loading" :data="list" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="部门" min-width="120">
        <template #default="{ row }">
          {{ row.dept?.name || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="角色">
        <template #default="{ row }">
          <el-tag v-for="r in row.roles" :key="r.id" size="small" class="tag">{{ r.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">{{ row.status === 1 ? '正常' : '禁用' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-permission="'system:user:update'" type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.id !== 1" v-permission="'system:user:delete'" type="danger" link @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next, sizes"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="dialog" :title="form.id ? '编辑用户' : '新建用户'" width="520px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="用户名" v-if="!form.id">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item v-else label="用户名">
          <span>{{ form.username }}</span>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="form.deptId" clearable placeholder="可不选" style="width: 100%">
            <el-option v-for="d in deptOptions" :key="d.id" :label="d.label" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleIds" multiple placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in rolesOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
  </div>
</template>

<style scoped>
.tag {
  margin-right: 4px;
}
</style>

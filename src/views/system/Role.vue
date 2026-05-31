<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import type { ElTree } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as api from '@/api/admin'
import type { AdminRole, PermissionModuleTree } from '@/api/types'

type PermTreeNode = {
  id: string | number
  label: string
  disabled?: boolean
  children?: PermTreeNode[]
}

const loading = ref(false)
const list = ref<AdminRole[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 10, keyword: '' })

const dialog = ref(false)
const saving = ref(false)
const form = reactive({
  id: 0,
  name: '',
  code: '',
  remark: '',
  status: 1,
})

const permModules = ref<PermissionModuleTree[]>([])
const permTree = computed<PermTreeNode[]>(() =>
  permModules.value.map((m) => ({
    id: `m:${m.module}`,
    label: m.moduleLabel,
    disabled: true,
    children: m.permissions.map((p) => ({
      id: p.id,
      label: `${p.name} (${p.code})`,
    })),
  })),
)
const treeRef = ref<InstanceType<typeof ElTree>>()
const checkedPermIds = ref<number[]>([])

async function load() {
  loading.value = true
  try {
    const res = await api.fetchRoles(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadPermissions() {
  permModules.value = await api.permissionsTree()
}

function treeProps() {
  return {
    children: 'children',
    label: 'label',
    disabled: 'disabled',
  }
}

async function openCreate() {
  form.id = 0
  form.name = ''
  form.code = ''
  form.remark = ''
  form.status = 1
  checkedPermIds.value = []
  dialog.value = true
  await nextTick()
  treeRef.value?.setCheckedKeys([])
}

async function openEdit(row: AdminRole) {
  const r = await api.getRole(row.id)
  form.id = r.id
  form.name = r.name
  form.code = r.code
  form.remark = r.remark
  form.status = r.status
  checkedPermIds.value = (r.permissions || []).map((p) => p.id)
  dialog.value = true
  await nextTick()
  treeRef.value?.setCheckedKeys(checkedPermIds.value, false)
}

async function save() {
  saving.value = true
  try {
    const keys = (treeRef.value?.getCheckedKeys(false) as (string | number)[]) || []
    const permissionIds = keys.filter((k): k is number => typeof k === 'number')
    const payload = {
      name: form.name,
      code: form.code,
      remark: form.remark,
      status: form.status,
      permissionIds,
    }
    if (form.id) {
      await api.updateRole(form.id, payload)
    } else {
      await api.createRole(payload)
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

async function remove(row: AdminRole) {
  await ElMessageBox.confirm(`删除角色「${row.name}」？`, '确认', { type: 'warning' })
  await api.deleteRole(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(() => {
  loadPermissions()
  load()
})
</script>

<template>
  <div class="page-shell">
  <el-card class="surface-card surface-card--table" shadow="never">
    <div class="table-toolbar">
      <el-form inline @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="名称/编码" @keyup.enter="load" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="() => { query.page = 1; load() }">查询</el-button>
          <el-button v-permission="'system:role:create'" @click="openCreate">
            <el-icon class="el-icon--left"><Plus /></el-icon>
            新建
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table v-loading="loading" :data="list" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">{{ row.status === 1 ? '正常' : '禁用' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-permission="'system:role:update'" type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button
            v-if="row.code !== 'super_admin'"
            v-permission="'system:role:delete'"
            type="danger"
            link
            @click="remove(row)"
          >
            删除
          </el-button>
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

    <el-dialog v-model="dialog" :title="form.id ? '编辑角色' : '新建角色'" width="620px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="功能权限">
          <p class="perm-tree-hint">分组名称来自菜单；勾选具体权限项分配给角色</p>
          <el-tree
            ref="treeRef"
            :data="permTree"
            show-checkbox
            node-key="id"
            :props="treeProps()"
            default-expand-all
            class="perm-tree"
          />
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
.perm-tree {
  width: 100%;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px;
}

.perm-tree-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as api from '@/api/admin'
import type { AdminDept } from '@/api/types'

const loading = ref(false)
const treeData = ref<AdminDept[]>([])

const dialog = ref(false)
const saving = ref(false)
const form = reactive({
  id: 0,
  parentId: 0,
  name: '',
  sort: 0,
  status: 1,
  remark: '',
})

function flattenDepts(nodes: AdminDept[]): AdminDept[] {
  const out: AdminDept[] = []
  const walk = (list: AdminDept[]) => {
    for (const n of list) {
      out.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

function resetForm() {
  form.id = 0
  form.parentId = 0
  form.name = ''
  form.sort = 0
  form.status = 1
  form.remark = ''
}

async function load() {
  loading.value = true
  try {
    treeData.value = await api.deptsTree()
  } finally {
    loading.value = false
  }
}

const parentOptions = computed(() => {
  const flat = flattenDepts(treeData.value)
  const opts = flat
    .filter((d) => d.id !== form.id)
    .map((d) => ({ value: d.id, label: d.name }))
  return [{ value: 0, label: '根部门' }, ...opts]
})

function openCreate(parentId?: number) {
  resetForm()
  if (parentId !== undefined) form.parentId = parentId
  dialog.value = true
}

async function openEdit(row: AdminDept) {
  const d = await api.getDept(row.id)
  form.id = d.id
  form.parentId = d.parentId
  form.name = d.name
  form.sort = d.sort
  form.status = d.status
  form.remark = d.remark
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      parentId: form.parentId,
      name: form.name,
      sort: form.sort,
      status: form.status,
      remark: form.remark,
    }
    if (form.id) {
      await api.updateDept(form.id, payload)
    } else {
      await api.createDept(payload)
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

async function remove(row: AdminDept) {
  await ElMessageBox.confirm(`删除部门「${row.name}」？`, '确认', { type: 'warning' })
  await api.deleteDept(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <el-card class="surface-card surface-card--table" shadow="never">
      <div class="table-toolbar">
        <el-button v-permission="'system:dept:create'" type="primary" @click="openCreate()">
          <el-icon class="el-icon--left"><Plus /></el-icon>
          新增根部门
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="treeData"
        row-key="id"
        border
        stripe
        default-expand-all
        :tree-props="{ children: 'children' }"
        style="width: 100%"
      >
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="sort" label="排序" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">{{ row.status === 1 ? '正常' : '禁用' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'system:dept:create'" type="primary" link @click="openCreate(row.id)">子项</el-button>
            <el-button v-permission="'system:dept:update'" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="'system:dept:delete'" type="danger" link @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialog" :title="form.id ? '编辑部门' : '新建部门'" width="520px" destroy-on-close>
        <el-form label-width="96px">
          <el-form-item label="父级部门">
            <el-select v-model="form.parentId" filterable style="width: 100%">
              <el-option v-for="o in parentOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="3" />
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

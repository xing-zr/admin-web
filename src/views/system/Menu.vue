<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as Icons from '@element-plus/icons-vue'
import * as api from '@/api/admin'
import type { MenuTree } from '@/api/types'
import { flattenMenuTree } from '@/utils/menu'

type PermOption = { code: string; name: string; permType: number }

/** Element Plus Icons 组件名（与侧栏 menuIcon 解析一致，PascalCase） */
const allIconNames = (Object.keys(Icons) as string[])
  .filter((k) => k !== 'default')
  .sort((a, b) => a.localeCompare(b))

function menuIconComponent(name?: string) {
  if (!name) return Icons.Menu
  const k = name as keyof typeof Icons
  return (Icons[k] as typeof Icons.Menu) || Icons.Menu
}

const iconSelectOptions = computed(() => {
  const names = [...allIconNames]
  if (form.icon && !names.includes(form.icon)) {
    names.push(form.icon)
    names.sort((a, b) => a.localeCompare(b))
  }
  return names
})

const loading = ref(false)
const treeData = ref<MenuTree[]>([])
const allPermissions = ref<PermOption[]>([])

const permOptions = computed(() => {
  if (form.menuType === 3) {
    return allPermissions.value.filter((p) => p.permType === 2)
  }
  if (form.menuType === 2) {
    return allPermissions.value.filter((p) => p.permType === 1)
  }
  return allPermissions.value
})

const dialog = ref(false)
const saving = ref(false)
const form = reactive({
  id: 0,
  parentId: 0,
  name: '',
  path: '',
  component: '',
  redirect: '',
  icon: '',
  sort: 0,
  hidden: false,
  perms: '',
  menuType: 2,
})

function resetForm() {
  form.id = 0
  form.parentId = 0
  form.name = ''
  form.path = ''
  form.component = ''
  form.redirect = ''
  form.icon = ''
  form.sort = 0
  form.hidden = false
  form.perms = ''
  form.menuType = 2
}

async function loadPermissions() {
  const list = await api.permissionsAll()
  allPermissions.value = list.map((p) => ({
    code: p.code,
    name: p.name,
    permType: p.permType,
  }))
}

async function load() {
  loading.value = true
  try {
    treeData.value = await api.menusTree()
  } finally {
    loading.value = false
  }
}

const parentOptions = computed(() => {
  const flat = flattenMenuTree(treeData.value)
  const opts = flat
    .filter((m) => m.id !== form.id)
    .map((m) => ({ value: m.id, label: `${m.name} (${m.path || '—'})` }))
  return [{ value: 0, label: '根' }, ...opts]
})

function openCreate(parentId?: number) {
  resetForm()
  if (parentId !== undefined) form.parentId = parentId
  dialog.value = true
}

async function openEdit(row: MenuTree) {
  const m = await api.getMenu(row.id)
  form.id = m.id
  form.parentId = m.parentId
  form.name = m.name
  form.path = m.path
  form.component = m.component
  form.redirect = m.redirect
  form.icon = m.icon
  form.sort = m.sort
  form.hidden = m.hidden
  form.perms = m.perms
  form.menuType = m.menuType
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      parentId: form.parentId,
      name: form.name,
      path: form.path,
      component: form.component,
      redirect: form.redirect,
      icon: form.icon,
      sort: form.sort,
      hidden: form.hidden,
      perms: form.perms,
      menuType: form.menuType,
    }
    if (form.id) {
      await api.updateMenu(form.id, payload)
    } else {
      await api.createMenu(payload)
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

async function remove(row: MenuTree) {
  await ElMessageBox.confirm(`删除菜单「${row.name}」？`, '确认', { type: 'warning' })
  await api.deleteMenu(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  await loadPermissions()
  await load()
})
</script>

<template>
  <div class="page-shell">
    <el-card class="surface-card surface-card--table" shadow="never">
      <div class="table-toolbar">
        <el-button v-permission="'system:menu:create'" type="primary" @click="openCreate()">
          <el-icon class="el-icon--left"><Plus /></el-icon>
          新增根菜单
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
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="path" label="路径" min-width="160" show-overflow-tooltip />
        <el-table-column prop="component" label="组件" min-width="160" show-overflow-tooltip />
        <el-table-column label="图标" width="140">
          <template #default="{ row }">
            <span class="icon-cell">
              <el-icon v-if="row.icon" class="icon-cell-ico" :size="18">
                <component :is="menuIconComponent(row.icon)" />
              </el-icon>
              <span class="icon-cell-text">{{ row.icon || '—' }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="perms" label="权限标识" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            {{ row.menuType === 1 ? '目录' : row.menuType === 3 ? '按钮' : '菜单' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'system:menu:create'" type="primary" link @click="openCreate(row.id)">子项</el-button>
            <el-button v-permission="'system:menu:update'" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="'system:menu:delete'" type="danger" link @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialog" :title="form.id ? '编辑菜单' : '新建菜单'" width="560px" destroy-on-close>
        <el-form label-width="96px">
          <el-form-item label="父级">
            <el-select v-model="form.parentId" filterable style="width: 100%">
              <el-option v-for="o in parentOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="路径">
            <el-input v-model="form.path" placeholder="如 /system/users" />
          </el-form-item>
          <el-form-item label="组件">
            <el-input v-model="form.component" placeholder="如 system/user/index" />
          </el-form-item>
          <el-form-item label="重定向">
            <el-input v-model="form.redirect" />
          </el-form-item>
          <el-form-item label="图标">
            <el-select
              v-model="form.icon"
              filterable
              clearable
              placeholder="搜索并选择图标"
              style="width: 100%"
            >
              <el-option value="" label="无（默认菜单图标）">
                <span class="icon-option">
                  <span class="icon-option-label">无（默认菜单图标）</span>
                </span>
              </el-option>
              <el-option v-for="name in iconSelectOptions" :key="name" :label="name" :value="name">
                <span class="icon-option">
                  <el-icon class="icon-option-ico" :size="18">
                    <component :is="menuIconComponent(name)" />
                  </el-icon>
                  <span class="icon-option-label">{{ name }}</span>
                </span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="form.menuType" style="width: 100%">
              <el-option :value="1" label="目录" />
              <el-option :value="2" label="菜单" />
              <el-option :value="3" label="按钮" />
            </el-select>
          </el-form-item>
          <el-form-item label="绑定权限">
            <el-select
              v-model="form.perms"
              filterable
              clearable
              allow-create
              default-first-option
              placeholder="从权限列表选择或输入标识"
              style="width: 100%"
            >
              <el-option
                v-for="p in permOptions"
                :key="p.code"
                :label="`${p.name} (${p.code})`"
                :value="p.code"
              />
            </el-select>
            <p class="form-hint">页面菜单选「菜单」类权限，按钮选「按钮」类权限</p>
          </el-form-item>
          <el-form-item label="隐藏">
            <el-switch v-model="form.hidden" />
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
.icon-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.icon-cell-ico {
  flex-shrink: 0;
  color: #1d4ed8;
}

.icon-cell-text {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.icon-option-ico {
  flex-shrink: 0;
  color: #475569;
}

.icon-option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

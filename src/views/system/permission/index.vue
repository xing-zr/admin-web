<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import * as api from '@/api/admin'
import type { AdminAPI, AdminPermission } from '@/api/types'
import { moduleFromPermCode } from '@/utils/permission'

type MenuModuleOption = {
  id: number
  module: string
  name: string
  label: string
}

const loading = ref(false)
const list = ref<AdminPermission[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 10, keyword: '', module: '' })
const queryMenuId = ref<number>()

const menuOptions = ref<MenuModuleOption[]>([])
const moduleToMenuName = computed(() => {
  const map: Record<string, string> = {}
  for (const o of menuOptions.value) {
    if (!map[o.module]) map[o.module] = o.name
  }
  return map
})

const selectedMenuModule = computed(() => {
  if (!form.menuId) return ''
  return menuOptions.value.find((o) => o.id === form.menuId)?.module ?? ''
})

const menuLinkMissing = computed(() => !!form.id && !form.menuId)

const dialog = ref(false)
const saving = ref(false)
const form = reactive({
  id: 0,
  code: '',
  name: '',
  menuId: undefined as number | undefined,
  permType: 1,
  status: 1,
  sort: 0,
  remark: '',
})

const permTypeLabel: Record<number, string> = {
  1: '菜单',
  2: '按钮',
  3: 'API',
  4: '其他',
}

const apiDrawer = ref(false)
const apiLoading = ref(false)
const apiSaving = ref(false)
const apiReloading = ref(false)
const currentPerm = ref<AdminPermission | null>(null)
const apiList = ref<AdminAPI[]>([])
const apiDialog = ref(false)
const apiForm = reactive({
  id: 0,
  method: 'GET',
  pathPattern: '',
  name: '',
  status: 1,
})

async function loadMenuOptions() {
  const menus = await api.menusFlat()
  menuOptions.value = menus
    .filter((m) => m.menuType === 2 && m.perms)
    .map((m) => ({
      id: m.id,
      module: moduleFromPermCode(m.perms),
      name: m.name,
      label: `${m.name}（${m.path || m.perms}）`,
    }))
}

function findMenuIdByModule(module: string) {
  return menuOptions.value.find((o) => o.module === module)?.id
}

function onQueryMenuChange(menuId: number | undefined) {
  if (!menuId) {
    query.module = ''
    return
  }
  query.module = menuOptions.value.find((o) => o.id === menuId)?.module ?? ''
}

async function load() {
  loading.value = true
  try {
    const res = await api.fetchPermissions(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.id = 0
  form.code = ''
  form.name = ''
  form.menuId = undefined
  form.permType = 1
  form.status = 1
  form.sort = 0
  form.remark = ''
  dialog.value = true
}

async function openEdit(row: AdminPermission) {
  const p = await api.getPermission(row.id)
  form.id = p.id
  form.code = p.code
  form.name = p.name
  form.menuId = findMenuIdByModule(p.module)
  form.permType = p.permType
  form.status = p.status
  form.sort = p.sort
  form.remark = p.remark
  dialog.value = true
}

async function save() {
  if (!form.menuId) {
    ElMessage.warning('请选择所属菜单')
    return
  }
  saving.value = true
  try {
    const payload = {
      code: form.code,
      name: form.name,
      menuId: form.menuId,
      permType: form.permType,
      status: form.status,
      sort: form.sort,
      remark: form.remark,
    }
    if (form.id) {
      await api.updatePermission(form.id, payload)
    } else {
      await api.createPermission(payload)
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

async function remove(row: AdminPermission) {
  await ElMessageBox.confirm(`删除权限「${row.name}」？`, '确认', { type: 'warning' })
  await api.deletePermission(row.id)
  ElMessage.success('已删除')
  await load()
}

async function openApiDrawer(row: AdminPermission) {
  currentPerm.value = row
  apiDrawer.value = true
  await loadApisForPerm()
}

async function loadApisForPerm() {
  if (!currentPerm.value) return
  apiLoading.value = true
  try {
    const res = await api.fetchAPIs({ permissionId: currentPerm.value.id, pageSize: 100 })
    apiList.value = res.list
  } finally {
    apiLoading.value = false
  }
}

function openCreateApi() {
  apiForm.id = 0
  apiForm.method = 'GET'
  apiForm.pathPattern = '/api/admin/'
  apiForm.name = ''
  apiForm.status = 1
  apiDialog.value = true
}

async function openEditApi(row: AdminAPI) {
  const r = await api.getAPI(row.id)
  apiForm.id = r.id
  apiForm.method = r.method
  apiForm.pathPattern = r.pathPattern
  apiForm.name = r.name
  apiForm.status = r.status
  apiDialog.value = true
}

async function saveApi() {
  if (!currentPerm.value) return
  apiSaving.value = true
  try {
    const payload = {
      method: apiForm.method,
      pathPattern: apiForm.pathPattern,
      permissionId: currentPerm.value.id,
      name: apiForm.name,
      status: apiForm.status,
    }
    if (apiForm.id) {
      await api.updateAPI(apiForm.id, payload)
    } else {
      await api.createAPI(payload)
    }
    ElMessage.success('接口已保存，路由表已刷新')
    apiDialog.value = false
    await loadApisForPerm()
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    apiSaving.value = false
  }
}

async function removeApi(row: AdminAPI) {
  await ElMessageBox.confirm(`删除接口「${row.method} ${row.pathPattern}」？`, '确认', { type: 'warning' })
  await api.deleteAPI(row.id)
  ElMessage.success('已删除，路由表已刷新')
  await loadApisForPerm()
}

async function reloadRoutes() {
  apiReloading.value = true
  try {
    await api.reloadAPIRoutes()
    ElMessage.success('路由表已重载')
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    apiReloading.value = false
  }
}

onMounted(async () => {
  await loadMenuOptions()
  await load()
})
</script>

<template>
  <div class="page-shell">
    <el-card class="surface-card surface-card--table" shadow="never">
      <div class="table-toolbar">
        <el-form inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="query.keyword" clearable placeholder="标识/名称" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="菜单">
            <el-select
              v-model="queryMenuId"
              clearable
              filterable
              placeholder="全部"
              style="width: 200px"
              @change="onQueryMenuChange"
            >
              <el-option v-for="o in menuOptions" :key="o.id" :label="o.label" :value="o.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="() => { query.page = 1; load() }">查询</el-button>
            <el-button v-permission="'system:permission:create'" @click="openCreate">
              <el-icon class="el-icon--left"><Plus /></el-icon>
              新建权限
            </el-button>
            <el-button v-permission="'system:api:update'" :loading="apiReloading" @click="reloadRoutes">
              <el-icon class="el-icon--left"><Refresh /></el-icon>
              重载路由
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="list" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="code" label="权限标识" min-width="180" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column label="所属菜单" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ moduleToMenuName[row.module] || '—' }}</template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ permTypeLabel[row.permType] || row.permType }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">{{ row.status === 1 ? '启用' : '禁用' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'system:api:list'"
              type="primary"
              link
              @click="openApiDrawer(row)"
            >
              接口
            </el-button>
            <el-button v-permission="'system:permission:update'" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="'system:permission:delete'" type="danger" link @click="remove(row)">删除</el-button>
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

      <!-- 权限表单 -->
      <el-dialog v-model="dialog" :title="form.id ? '编辑权限' : '新建权限'" width="560px" destroy-on-close>
        <el-form label-width="96px">
          <el-form-item label="权限标识">
            <el-input v-model="form.code" placeholder="如 system:user:create" />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="所属菜单" required>
            <el-select v-model="form.menuId" filterable placeholder="选择页面菜单" style="width: 100%">
              <el-option v-for="o in menuOptions" :key="o.id" :label="o.label" :value="o.id" />
            </el-select>
            <p v-if="selectedMenuModule" class="form-hint">模块标识：{{ selectedMenuModule }}</p>
            <p v-if="menuLinkMissing" class="form-hint form-hint--warn">未找到对应页面菜单，请重新选择</p>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="form.permType" style="width: 100%">
              <el-option :value="1" label="菜单" />
              <el-option :value="2" label="按钮" />
              <el-option :value="3" label="API" />
              <el-option :value="4" label="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" rows="2" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialog = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </template>
      </el-dialog>

      <!-- 接口管理抽屉（一对多） -->
      <el-drawer
        v-model="apiDrawer"
        :title="currentPerm ? `${currentPerm.name} · 绑定接口` : '绑定接口'"
        size="680px"
        destroy-on-close
      >
        <div v-if="currentPerm" class="api-drawer-head">
          <p class="api-drawer-code">{{ currentPerm.code }}</p>
          <el-button v-permission="'system:api:create'" type="primary" size="small" @click="openCreateApi">
            <el-icon class="el-icon--left"><Plus /></el-icon>
            添加接口
          </el-button>
        </div>

        <el-table
          v-loading="apiLoading"
          :data="apiList"
          class="api-drawer-table"
          stripe
          size="small"
          style="width: 100%"
        >
          <el-table-column
            prop="method"
            label="方法"
            width="76"
            align="center"
            class-name="col-nowrap"
            label-class-name="col-nowrap"
          />
          <el-table-column prop="pathPattern" label="路径" min-width="160" show-overflow-tooltip />
          <el-table-column prop="name" label="说明" min-width="100" show-overflow-tooltip />
          <el-table-column
            label="状态"
            width="68"
            align="center"
            class-name="col-nowrap"
            label-class-name="col-nowrap"
          >
            <template #default="{ row }">{{ row.status === 1 ? '启用' : '禁用' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="132" align="center">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button v-permission="'system:api:update'" type="primary" link @click="openEditApi(row)">编辑</el-button>
                <el-button v-permission="'system:api:delete'" type="danger" link @click="removeApi(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!apiLoading && apiList.length === 0" description="暂无绑定接口，点击上方添加" />

        <el-dialog
          v-model="apiDialog"
          :title="apiForm.id ? '编辑接口' : '添加接口'"
          width="520px"
          append-to-body
          destroy-on-close
        >
          <el-form label-width="96px">
            <el-form-item label="HTTP 方法">
              <el-select v-model="apiForm.method" style="width: 100%">
                <el-option value="GET" label="GET" />
                <el-option value="POST" label="POST" />
                <el-option value="PUT" label="PUT" />
                <el-option value="DELETE" label="DELETE" />
              </el-select>
            </el-form-item>
            <el-form-item label="路径">
              <el-input v-model="apiForm.pathPattern" placeholder="/api/admin/xxx/:id" />
            </el-form-item>
            <el-form-item label="说明">
              <el-input v-model="apiForm.name" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="apiForm.status" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="apiDialog = false">取消</el-button>
            <el-button type="primary" :loading="apiSaving" @click="saveApi">保存</el-button>
          </template>
        </el-dialog>
      </el-drawer>
    </el-card>
  </div>
</template>

<style scoped>
.api-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.api-drawer-code {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, monospace;
}

.api-drawer-table :deep(.col-nowrap .cell) {
  white-space: nowrap;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
}

.row-actions :deep(.el-button) {
  margin: 0;
  padding: 0;
}

.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-hint--warn {
  color: var(--el-color-warning);
}
</style>

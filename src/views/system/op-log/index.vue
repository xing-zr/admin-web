<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import type { OpLog } from '@/api/types'
import * as api from '@/api/admin'

/** 尝试格式化为 JSON，失败则原样返回 */
function formatJsonBody(raw: string): string {
  if (!raw) return ''
  const t = raw.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) {
    return raw
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

const loading = ref(false)
const list = ref<OpLog[]>([])
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
})

async function load() {
  loading.value = true
  try {
    const res = await api.fetchOpLogs({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
    })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function shortUa(ua: string) {
  if (!ua) return '—'
  return ua.length > 64 ? `${ua.slice(0, 64)}…` : ua
}

function statusClass(code: number) {
  if (code >= 400) return 'is-err'
  if (code >= 300) return 'is-warn'
  return 'is-ok'
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <el-card class="surface-card surface-card--table" shadow="never">
      <el-form inline class="toolbar" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="用户名 / 路径 / 方法"
            @keyup.enter="load"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="() => { query.page = 1; load() }">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="72" />
        <el-table-column prop="username" label="操作人" width="100" show-overflow-tooltip />
        <el-table-column prop="method" label="方法" width="90" />
        <el-table-column prop="path" label="路径" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column label="状态码" width="88" align="center">
          <template #default="{ row }">
            <span class="status-code" :class="statusClass(row.statusCode)">{{ row.statusCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="latencyMs" label="耗时(ms)" width="100" />
        <el-table-column label="User-Agent" min-width="160">
          <template #default="{ row }">
            <span :title="row.userAgent">{{ shortUa(row.userAgent) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="请求体" width="88" align="center">
          <template #default="{ row }">
            <el-popover
              v-if="row.requestBody"
              placement="left-start"
              :width="560"
              trigger="hover"
              :show-after="200"
              :hide-after="200"
              popper-class="op-log-json-popover"
              teleported
            >
              <template #reference>
                <span class="body-trigger" tabindex="0">
                  <el-icon :size="20" class="body-ico"><Document /></el-icon>
                </span>
              </template>
              <pre class="json-tip-pre">{{ formatJsonBody(row.requestBody) }}</pre>
            </el-popover>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="172">
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '' }}
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
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 0;
}

.body-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.body-ico {
  color: #2563eb;
  transition: color 0.2s ease;
}

.body-trigger:hover .body-ico {
  color: #1d4ed8;
}

.muted {
  color: #94a3b8;
}

.status-code {
  display: inline-block;
  min-width: 2.25rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

.status-code.is-ok {
  background: #dcfce7;
  color: #166534;
}

.status-code.is-warn {
  background: #fef3c7;
  color: #92400e;
}

.status-code.is-err {
  background: #fee2e2;
  color: #b91c1c;
}
</style>

<style>
/* Popover 挂到 body，需非 scoped */
.op-log-json-popover.el-popper {
  max-width: min(560px, 92vw) !important;
}

.op-log-json-popover .json-tip-pre {
  margin: 0;
  max-height: min(60vh, 480px);
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: left;
  color: var(--el-text-color-primary, #0f172a);
}
</style>

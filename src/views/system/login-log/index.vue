<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { LoginLog } from '@/api/types'
import * as api from '@/api/admin'

const loading = ref(false)
const list = ref<LoginLog[]>([])
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '' as '' | '0' | '1',
})

async function load() {
  loading.value = true
  try {
    const res = await api.fetchLoginLogs({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status === '' ? undefined : Number(query.status),
    })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function statusText(s: number) {
  return s === 1 ? '成功' : '失败'
}

function shortUa(ua: string) {
  if (!ua) return '—'
  return ua.length > 80 ? `${ua.slice(0, 80)}…` : ua
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <el-card class="surface-card surface-card--table" shadow="never">
      <el-form inline class="toolbar" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="query.keyword" clearable placeholder="模糊搜索" @keyup.enter="load" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
            <el-option label="成功" value="1" />
            <el-option label="失败" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="() => { query.page = 1; load() }">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="120" show-overflow-tooltip />
        <el-table-column prop="adminUserId" label="用户ID" width="90" />
        <el-table-column prop="ip" label="IP" width="140" show-overflow-tooltip />
        <el-table-column label="User-Agent" min-width="200">
          <template #default="{ row }">
            <span :title="row.userAgent">{{ shortUa(row.userAgent) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="88">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msg" label="备注" min-width="160" show-overflow-tooltip />
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
</style>

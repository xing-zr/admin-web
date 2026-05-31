<script setup lang="ts">
import { Folder, Document } from '@element-plus/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import type { RuntimeLogChunk, RuntimeLogEntry } from '@/api/types'
import * as api from '@/api/admin'

const loading = ref(false)
const loadingFile = ref(false)
const items = ref<RuntimeLogEntry[]>([])
const currentPath = ref('')
const selectedFilePath = ref('')

/** 读取方式：尾部 | 从文件头按行 | 按字节 */
const readMode = ref<'tail' | 'lines' | 'bytes'>('tail')
const chunk = ref<RuntimeLogChunk | null>(null)

const linePageSize = 150
const linesPage = ref(1)
const byteOffset = ref(0)
const byteLimit = 65536

const viewMode = ref<'friendly' | 'raw'>('friendly')

interface LogSegment {
  lineNo: number
  raw: string
  parsed: boolean
  formatted?: string
  level?: string
  time?: string
  message?: string
  caller?: string
}

function tryParseJsonLine(line: string): Record<string, unknown> | null {
  const t = line.trim()
  if (!t.startsWith('{') || !t.endsWith('}')) return null
  try {
    return JSON.parse(t) as Record<string, unknown>
  } catch {
    return null
  }
}

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

function parseLine(raw: string, lineNo: number): LogSegment {
  const obj = tryParseJsonLine(raw)
  if (!obj) {
    return { lineNo, raw, parsed: false }
  }
  const level = str(obj.level).toUpperCase() || undefined
  const time = str(obj.time) || undefined
  const message = str(obj.message)
  const caller = str(obj.caller) || undefined
  let formatted: string
  try {
    formatted = JSON.stringify(obj, null, 2)
  } catch {
    formatted = raw
  }
  return {
    lineNo,
    raw,
    parsed: true,
    formatted,
    level,
    time,
    message,
    caller,
  }
}

function buildSegments(content: string, firstLineNo: number): LogSegment[] {
  const lines = content.split(/\n/)
  return lines.map((raw, i) => parseLine(raw, firstLineNo + i))
}

const segments = computed(() => {
  if (!chunk.value?.content) return []
  const c = chunk.value
  let first = 1
  if (c.mode === 'lines' && typeof c.startLine === 'number') {
    first = c.startLine + 1
  }
  return buildSegments(c.content, first)
})

function levelClass(level?: string): string {
  if (!level) return ''
  if (level === 'ERROR' || level === 'FATAL' || level === 'PANIC') return 'lv-error'
  if (level === 'WARN' || level === 'WARNING') return 'lv-warn'
  if (level === 'INFO') return 'lv-info'
  if (level === 'DEBUG') return 'lv-debug'
  return 'lv-other'
}

watch(readMode, () => {
  if (readMode.value === 'bytes') {
    viewMode.value = 'raw'
  }
})

watch(selectedFilePath, () => {
  linesPage.value = 1
  byteOffset.value = 0
  viewMode.value = 'friendly'
})

async function loadTail() {
  if (!selectedFilePath.value) return
  loadingFile.value = true
  try {
    chunk.value = await api.fetchRuntimeLogChunk({
      path: selectedFilePath.value,
      mode: 'tail',
      lineLimit: linePageSize,
    })
  } finally {
    loadingFile.value = false
  }
}

async function loadTailOlder() {
  if (!selectedFilePath.value || chunk.value?.rangeStartByte == null || chunk.value.rangeStartByte <= 0) return
  loadingFile.value = true
  try {
    chunk.value = await api.fetchRuntimeLogChunk({
      path: selectedFilePath.value,
      mode: 'tail_older',
      beforeByte: chunk.value.rangeStartByte,
      lineLimit: linePageSize,
    })
  } finally {
    loadingFile.value = false
  }
}

async function loadLinesPage() {
  if (!selectedFilePath.value) return
  loadingFile.value = true
  try {
    const startLine = (linesPage.value - 1) * linePageSize
    chunk.value = await api.fetchRuntimeLogChunk({
      path: selectedFilePath.value,
      mode: 'lines',
      startLine,
      lineLimit: linePageSize,
    })
  } finally {
    loadingFile.value = false
  }
}

async function loadBytesPage() {
  if (!selectedFilePath.value) return
  loadingFile.value = true
  try {
    chunk.value = await api.fetchRuntimeLogChunk({
      path: selectedFilePath.value,
      mode: 'bytes',
      byteOffset: byteOffset.value,
      byteLimit,
    })
  } finally {
    loadingFile.value = false
  }
}

async function applyReadMode() {
  if (!selectedFilePath.value) return
  if (readMode.value === 'tail') {
    await loadTail()
  } else if (readMode.value === 'lines') {
    await loadLinesPage()
  } else {
    await loadBytesPage()
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function formatTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

const breadcrumbParts = ref<{ label: string; path: string }[]>([{ label: 'runtime', path: '' }])

function rebuildBreadcrumb() {
  const p = currentPath.value
  const parts: { label: string; path: string }[] = [{ label: 'runtime', path: '' }]
  if (!p) {
    breadcrumbParts.value = parts
    return
  }
  const segs = p.split('/').filter(Boolean)
  let acc = ''
  for (const s of segs) {
    acc = acc ? `${acc}/${s}` : s
    parts.push({ label: s, path: acc })
  }
  breadcrumbParts.value = parts
}

async function loadList() {
  loading.value = true
  try {
    const res = await api.fetchRuntimeLogList(currentPath.value || undefined)
    items.value = res.items
    rebuildBreadcrumb()
  } finally {
    loading.value = false
  }
}

function goBreadcrumb(path: string) {
  currentPath.value = path
  chunk.value = null
  selectedFilePath.value = ''
  loadList()
}

function goUp() {
  if (!currentPath.value) return
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = parts.join('/')
  chunk.value = null
  selectedFilePath.value = ''
  loadList()
}

async function openEntry(row: RuntimeLogEntry) {
  if (row.isDir) {
    currentPath.value = row.path
    chunk.value = null
    selectedFilePath.value = ''
    await loadList()
    return
  }
  selectedFilePath.value = row.path
  readMode.value = 'tail'
  linesPage.value = 1
  byteOffset.value = 0
  await loadTail()
}

function onReadModeChange() {
  linesPage.value = 1
  byteOffset.value = 0
  applyReadMode()
}

function linesPrevPage() {
  if (linesPage.value <= 1) return
  linesPage.value -= 1
  loadLinesPage()
}

function linesNextPage() {
  if (!chunk.value?.hasMoreAfter) return
  linesPage.value += 1
  loadLinesPage()
}

function bytesPrevPage() {
  const next = Math.max(0, byteOffset.value - byteLimit)
  byteOffset.value = next
  loadBytesPage()
}

function bytesNextPage() {
  if (!chunk.value || chunk.value.byteEof) return
  byteOffset.value = chunk.value.nextByteOffset ?? byteOffset.value + byteLimit
  loadBytesPage()
}

onMounted(loadList)
</script>

<template>
  <div class="page-shell page-shell--runtime-log">
    <el-card class="surface-card surface-card--runtime-log" shadow="never">
      <div class="toolbar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="(b, i) in breadcrumbParts" :key="b.path + String(i)">
            <a href="javascript:;" @click.prevent="goBreadcrumb(b.path)">{{ b.label }}</a>
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="toolbar-actions">
          <el-button :disabled="!currentPath" @click="goUp">上级目录</el-button>
          <el-button type="primary" @click="loadList">刷新</el-button>
        </div>
      </div>
      <p class="hint">数据来自服务端 <code>runtime</code> 目录；大文件按分页拉取，避免一次加载整文件。</p>

      <el-table
        v-loading="loading"
        :data="items"
        border
        stripe
        style="width: 100%"
        class="file-table"
        @row-click="openEntry"
      >
        <el-table-column label="名称" min-width="220">
          <template #default="{ row }">
            <span class="name-cell">
              <el-icon class="ico" :size="18">
                <Folder v-if="row.isDir" />
                <Document v-else />
              </el-icon>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="88">
          <template #default="{ row }">
            {{ row.isDir ? '目录' : '文件' }}
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">
            {{ row.isDir ? '—' : formatBytes(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.modTime) }}
          </template>
        </el-table-column>
      </el-table>

      <div v-if="chunk && selectedFilePath" v-loading="loadingFile" class="preview-wrap">
        <div class="preview-head">
          <span class="preview-title">{{ chunk.path }}</span>
          <span class="preview-meta">共 {{ formatBytes(chunk.size) }}</span>
          <el-select v-model="readMode" size="small" class="read-mode-sel" @change="onReadModeChange">
            <el-option label="尾部（最新）" value="tail" />
            <el-option label="从文件头按行" value="lines" />
            <el-option label="按字节" value="bytes" />
          </el-select>
        </div>

        <div v-if="readMode === 'tail'" class="pager-bar">
          <el-button size="small" @click="loadTail">刷新本段</el-button>
          <el-button size="small" type="primary" :disabled="!chunk.hasMoreBefore" @click="loadTailOlder">
            更早一段
          </el-button>
          <span v-if="chunk.rangeStartByte != null" class="meta-byte">
            本段字节范围 [{{ chunk.rangeStartByte }}, {{ chunk.rangeEndByte ?? '?' }})
          </span>
        </div>

        <div v-if="readMode === 'lines'" class="pager-bar">
          <el-button size="small" :disabled="linesPage <= 1" @click="linesPrevPage">上一页</el-button>
          <span class="page-hint">第 {{ linesPage }} 段 · 每段 {{ linePageSize }} 行</span>
          <el-button size="small" :disabled="!chunk.hasMoreAfter" @click="linesNextPage">下一页</el-button>
          <el-button size="small" @click="loadLinesPage">刷新</el-button>
        </div>

        <div v-if="readMode === 'bytes'" class="pager-bar">
          <el-button size="small" :disabled="byteOffset <= 0" @click="bytesPrevPage">上一段</el-button>
          <span class="meta-byte">offset {{ byteOffset }} · 长度 {{ chunk.byteLength ?? 0 }}</span>
          <el-button size="small" :disabled="!!chunk.byteEof" @click="bytesNextPage">下一段</el-button>
        </div>

        <div class="preview-head preview-head--sub">
          <el-radio-group v-if="readMode !== 'bytes'" v-model="viewMode" size="small" class="view-toggle">
            <el-radio-button label="friendly">友好视图</el-radio-button>
            <el-radio-button label="raw">原始文本</el-radio-button>
          </el-radio-group>
          <span v-else class="byte-hint">按字节模式仅显示原始文本（可能截断在多字节字符中间）</span>
        </div>

        <div v-if="readMode === 'bytes'" class="preview-scroll">
          <pre class="log-pre log-pre--raw">{{ chunk.content }}</pre>
        </div>
        <template v-else>
          <div v-if="viewMode === 'raw'" class="preview-scroll">
            <pre class="log-pre log-pre--raw">{{ chunk.content }}</pre>
          </div>
          <div v-else class="preview-scroll friendly-scroll">
            <div class="friendly-log">
              <div
                v-for="(seg, idx) in segments"
                :key="idx"
                class="log-row"
                :class="[seg.parsed ? levelClass(seg.level) : 'lv-plain']"
              >
                <span class="log-row__no">{{ seg.lineNo }}</span>
                <div class="log-row__body">
                  <template v-if="seg.parsed">
                    <div class="json-card">
                      <div class="json-card__meta">
                        <span v-if="seg.level" class="lvl-tag">{{ seg.level }}</span>
                        <span v-if="seg.time" class="json-card__time">{{ seg.time }}</span>
                        <span v-if="seg.caller" class="json-card__caller">{{ seg.caller }}</span>
                      </div>
                      <p v-if="seg.message" class="json-card__msg">{{ seg.message }}</p>
                      <pre class="json-card__pre">{{ seg.formatted }}</pre>
                    </div>
                  </template>
                  <pre v-else class="plain-line">{{ seg.raw || ' ' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #64748b;
}

.hint code {
  font-size: 12px;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
}

.name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ico {
  color: #64748b;
  flex-shrink: 0;
}

.file-table :deep(.el-table__row) {
  cursor: pointer;
}

.read-mode-sel {
  width: 168px;
}

.pager-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
}

.page-hint {
  font-size: 13px;
  color: #64748b;
}

.meta-byte {
  font-size: 12px;
  color: #64748b;
  font-family: ui-monospace, monospace;
}

.byte-hint {
  font-size: 12px;
  color: #94a3b8;
}

.preview-scroll {
  max-height: calc(100vh - 400px);
  min-height: 200px;
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 8px;
}

.friendly-scroll {
  border: 1px solid #1e293b;
  background: #020617;
}

.preview-wrap {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  min-height: 0;
}

.preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.preview-head--sub {
  margin-top: 4px;
}

.view-toggle {
  margin-left: 0;
}

.preview-title {
  font-weight: 600;
  font-size: 13px;
  word-break: break-all;
}

.preview-meta {
  font-size: 12px;
  color: #64748b;
}

.log-pre {
  margin: 0;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
}

.log-pre--raw {
  min-height: 120px;
}

.friendly-log {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
}

.log-row {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  gap: 0;
  border-bottom: 1px solid #1e293b;
  border-left: 3px solid transparent;
}

.log-row:last-child {
  border-bottom: none;
}

.log-row.lv-error {
  border-left-color: #f87171;
  background: rgba(248, 113, 113, 0.06);
}

.log-row.lv-warn {
  border-left-color: #fbbf24;
  background: rgba(251, 191, 36, 0.06);
}

.log-row.lv-info {
  border-left-color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
}

.log-row.lv-debug {
  border-left-color: #94a3b8;
}

.log-row.lv-other {
  border-left-color: #a78bfa;
}

.log-row.lv-plain {
  border-left-color: #475569;
}

.log-row__no {
  padding: 10px 6px;
  text-align: right;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #64748b;
  background: #0f172a;
  user-select: none;
  border-right: 1px solid #1e293b;
  align-self: stretch;
}

.log-row__body {
  min-width: 0;
  padding: 10px 12px;
}

.json-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 6px;
}

.lvl-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: #334155;
  color: #f1f5f9;
}

.lv-error .lvl-tag {
  background: #7f1d1d;
  color: #fecaca;
}

.lv-warn .lvl-tag {
  background: #713f12;
  color: #fef08a;
}

.lv-info .lvl-tag {
  background: #0c4a6e;
  color: #bae6fd;
}

.lv-debug .lvl-tag {
  background: #334155;
  color: #cbd5e1;
}

.json-card__time {
  font-size: 12px;
  color: #94a3b8;
  font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
}

.json-card__caller {
  font-size: 11px;
  color: #64748b;
  word-break: break-all;
}

.json-card__msg {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.45;
  color: #e2e8f0;
  word-break: break-word;
  white-space: pre-wrap;
  max-height: 7.5em;
  overflow-y: auto;
}

.json-card__pre {
  margin: 0;
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.45;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  background: #0f172a;
  color: #cbd5e1;
  border-radius: 6px;
  max-height: 280px;
  overflow: auto;
}

.plain-line {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  color: #cbd5e1;
}

.page-shell--runtime-log :deep(.surface-card--runtime-log) {
  overflow: visible;
}

.page-shell--runtime-log :deep(.surface-card--runtime-log .el-card__body) {
  overflow: visible;
}
</style>

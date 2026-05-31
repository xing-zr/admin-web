<script setup lang="ts">
import { User, UserFilled, Menu as MenuIcon, View, Histogram, PieChart, DataLine } from '@element-plus/icons-vue'
import type { ECharts, EChartsOption } from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as api from '@/api/admin'
import type { AdminMenu, AdminRole } from '@/api/types'
import { flattenMenuTree } from '@/utils/menu'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(true)
const userTotal = ref(0)
const roleTotal = ref(0)
const menus = ref<AdminMenu[]>([])
const roles = ref<AdminRole[]>([])

const lineRef = ref<HTMLDivElement | null>(null)
const pieRef = ref<HTMLDivElement | null>(null)
const barRef = ref<HTMLDivElement | null>(null)
const gaugeRef = ref<HTMLDivElement | null>(null)

let echartsLib: typeof import('echarts') | null = null
const charts: ECharts[] = []

const primary = '#1d4ed8'
const accent = '#f59e0b'
const muted = '#94a3b8'
const axisLine = 'rgba(15, 23, 42, 0.08)'

const inspirationalQuotes = [
  '人生没有白走的路，每一步都算数，当下的努力会在未来的某个时刻，以意想不到的方式回报你。',
  '不要等待完美的时机，最好的时间就是现在，把每一件小事做好，就是对未来最好的投资。',
  '真正的强大，不是从不跌倒，而是每次跌倒后都能重新站起来，带着更清晰的方向继续前行。',
  '当你觉得撑不下去的时候，记住你已经坚持到了现在，再往前走一步，或许就是转机。',
  '优秀的人不是天生就优秀，而是习惯了在别人休息的时候，默默积累、持续精进。',
  '把今天过充实，是对明天最好的准备；把小事做极致，是对梦想最踏实的靠近。',
  '那些看似不起波澜的日复一日，会在某一天让你看到，坚持本身就有意义。',
  '别害怕慢，只要不停；别害怕错，只要改；人生最重要的，是保持前进的姿态。',
  '每一次认真完成的工作，都是在为更好的自己投票；时间不会辜负每一个踏实前行的人。',
  '山再高，往上攀，总能登顶；路再长，走下去，定能到达。关键在于，你是否愿意迈出那一步。',
  '生活不会总是一帆风顺，但正是那些不易的时光，塑造了我们的韧性与智慧。',
  '不要把精力浪费在焦虑上，行动才是打破困境最有力的方式，先做，再调整，再精进。',
  '所谓幸运，不过是准备好了的人在机会来临时，能够稳稳地接住它。',
  '你若向阳，无惧悲伤；你若专注，岁月自会给出答案。请相信，努力本身就是一种意义。',
  '再长的路，一步步也能走完；再短的路，不迈开双脚也无法到达。坚持，往往是最好的捷径。',
]

const dailyQuote =
  inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)] ?? inspirationalQuotes[0]

function last7DayLabels() {
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return labels
}

/** 近 7 日趋势（示例数据，可对接真实统计接口） */
const trendMock = [14, 18, 16, 22, 26, 23, 31]

const hiddenMenuCount = computed(() => menus.value.filter((m) => m.hidden).length)

const menuTypePie = computed(() => {
  let dir = 0
  let page = 0
  let btn = 0
  for (const m of menus.value) {
    if (m.menuType === 1) dir++
    else if (m.menuType === 3) btn++
    else page++
  }
  return [
    { name: '目录', value: dir },
    { name: '菜单', value: page },
    { name: '按钮', value: btn },
  ].filter((d) => d.value > 0)
})

const topParentBars = computed(() => {
  const counts = new Map<number, number>()
  for (const m of menus.value) {
    if (m.parentId) {
      counts.set(m.parentId, (counts.get(m.parentId) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([pid, n]) => ({
      name: menus.value.find((x) => x.id === pid)?.name ?? `ID ${pid}`,
      value: n,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
})

const kpis = computed(() => [
  {
    label: '用户总数',
    value: userTotal.value,
    hint: '系统账号',
    icon: User,
    tone: 'blue',
  },
  {
    label: '角色总数',
    value: roleTotal.value,
    hint: 'RBAC 角色',
    icon: UserFilled,
    tone: 'slate',
  },
  {
    label: '菜单项',
    value: menus.value.length,
    hint: '含目录/菜单/按钮',
    icon: MenuIcon,
    tone: 'amber',
  },
  {
    label: '隐藏菜单',
    value: hiddenMenuCount.value,
    hint: '不在导航展示',
    icon: View,
    tone: 'muted',
  },
])

function baseGrid() {
  return {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '14%',
    containLabel: true,
  }
}

function lineOption(ec: typeof import('echarts')): EChartsOption {
  return {
    color: [primary],
    tooltip: { trigger: 'axis' },
    grid: baseGrid(),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: last7DayLabels(),
      axisLine: { lineStyle: { color: axisLine } },
      axisLabel: { color: muted },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: axisLine, type: 'dashed' } },
      axisLabel: { color: muted },
    },
    series: [
      {
        name: '活跃',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        areaStyle: {
          color: new ec.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(29, 78, 216, 0.35)' },
            { offset: 1, color: 'rgba(29, 78, 216, 0.02)' },
          ]),
        },
        lineStyle: { width: 3 },
        data: trendMock,
      },
    ],
  }
}

function pieOption(): EChartsOption {
  const data = menuTypePie.value.length
    ? menuTypePie.value
    : [{ name: '暂无', value: 1 }]
  return {
    color: [primary, '#3b82f6', accent, '#10b981'],
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: muted },
    },
    series: [
      {
        name: '菜单类型',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { color: '#475569' },
        data,
      },
    ],
  }
}

function barOption(): EChartsOption {
  const rows = topParentBars.value
  const names = rows.length ? rows.map((r) => r.name) : ['—']
  const vals = rows.length ? rows.map((r) => r.value) : [0]
  return {
    color: [primary],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { ...baseGrid(), top: '8%' },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: axisLine, type: 'dashed' } },
      axisLabel: { color: muted },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#475569', width: 100, overflow: 'truncate' },
    },
    series: [
      {
        name: '子项数',
        type: 'bar',
        barWidth: 14,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        data: vals,
      },
    ],
  }
}

function gaugeOption(): EChartsOption {
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        radius: '88%',
        center: ['50%', '58%'],
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.65, primary],
              [0.85, accent],
              [1, '#cbd5e1'],
            ],
          },
        },
        pointer: { length: '58%', width: 5, itemStyle: { color: primary } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: muted, distance: -36, fontSize: 11 },
        title: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 26,
          fontWeight: 700,
          color: '#0f172a',
          offsetCenter: [0, '24%'],
          formatter: '{value}%',
        },
        data: [{ value: 86, name: '健康度' }],
      },
    ],
  }
}

function resizeAll() {
  charts.forEach((c) => c.resize())
}

function disposeAll() {
  charts.forEach((c) => c.dispose())
  charts.length = 0
}

function mountCharts(ec: typeof import('echarts')) {
  disposeAll()
  const pairs: [HTMLElement | null, EChartsOption][] = [
    [lineRef.value, lineOption(ec)],
    [pieRef.value, pieOption()],
    [barRef.value, barOption()],
    [gaugeRef.value, gaugeOption()],
  ]
  for (const [el, opt] of pairs) {
    if (!el) continue
    const c = ec.init(el, undefined, { renderer: 'canvas' })
    c.setOption(opt)
    charts.push(c)
  }
}

async function load() {
  loading.value = true
  try {
    if (!echartsLib) {
      echartsLib = await import('echarts')
    }
    const [u, r, menuTree, allRoles] = await Promise.all([
      api.fetchUsers({ page: 1, pageSize: 1 }),
      api.fetchRoles({ page: 1, pageSize: 1 }),
      api.menusTree(),
      api.rolesAll(),
    ])
    userTotal.value = u.total
    roleTotal.value = r.total
    menus.value = flattenMenuTree(menuTree)
    roles.value = allRoles
  } catch {
    menus.value = []
    roles.value = []
  } finally {
    loading.value = false
    await nextTick()
    if (echartsLib) {
      mountCharts(echartsLib)
    }
  }
}

onMounted(() => {
  load()
  window.addEventListener('resize', resizeAll)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  disposeAll()
})
</script>

<template>
  <div v-loading="loading" class="page-shell dash-full">
    <div class="dash-head surface-card">
      <div class="dash-head-copy">
        <p class="eyebrow">工作台</p>
        <h1 class="title font-display">
          你好，{{ userStore.user?.nickname || userStore.user?.username }}
        </h1>
        <p class="sub">{{ dailyQuote }}</p>
      </div>
    </div>

    <div class="kpi-row">
      <div
        v-for="(k, i) in kpis"
        :key="k.label"
        class="kpi surface-card"
        :style="{ animationDelay: `${60 + i * 70}ms` }"
      >
        <div class="kpi-ico" :class="`tone-${k.tone}`">
          <el-icon :size="22"><component :is="k.icon" /></el-icon>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">{{ k.value }}</div>
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-hint">{{ k.hint }}</div>
        </div>
      </div>
    </div>

    <div class="chart-grid">
      <el-card class="surface-card chart-card" shadow="never">
        <template #header>
          <div class="card-head">
            <el-icon class="card-ico"><DataLine /></el-icon>
            <span>近 7 日趋势</span>
            <span class="card-sub">示例曲线 · 可对接埋点</span>
          </div>
        </template>
        <div ref="lineRef" class="chart-host" />
      </el-card>

      <el-card class="surface-card chart-card" shadow="never">
        <template #header>
          <div class="card-head">
            <el-icon class="card-ico"><PieChart /></el-icon>
            <span>菜单类型占比</span>
          </div>
        </template>
        <div ref="pieRef" class="chart-host chart-host-pie" />
      </el-card>

      <el-card class="surface-card chart-card" shadow="never">
        <template #header>
          <div class="card-head">
            <el-icon class="card-ico"><Histogram /></el-icon>
            <span>父级菜单子项数 Top</span>
            <span class="card-sub">按子节点数量</span>
          </div>
        </template>
        <div ref="barRef" class="chart-host chart-host-bar" />
      </el-card>

      <el-card class="surface-card chart-card" shadow="never">
        <template #header>
          <div class="card-head">
            <el-icon class="card-ico"><DataAnalysis /></el-icon>
            <span>运行健康度</span>
            <span class="card-sub">示例指标</span>
          </div>
        </template>
        <div ref="gaugeRef" class="chart-host chart-host-gauge" />
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.dash-full {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - var(--header-h) - 44px);
}

.dash-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px 22px !important;
  border-radius: var(--radius) !important;
  background: #fff !important;
  box-shadow: var(--shadow-card) !important;
  border: 1px solid rgba(15, 23, 42, 0.06) !important;
}

.dash-head-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #1d4ed8;
}

.title {
  margin: 0 0 6px;
  font-size: clamp(1.35rem, 2.2vw, 1.65rem);
  font-weight: 700;
  color: #0c1218;
  line-height: 1.2;
}

.sub {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.dash-head-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pill {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(29, 78, 216, 0.1);
  color: #1e40af;
  border: 1px solid rgba(29, 78, 216, 0.2);
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #f59e0b;
}

.hint {
  font-size: 13px;
  color: #64748b;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
}

.kpi {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 18px !important;
  border-radius: var(--radius) !important;
  background: #fff !important;
  box-shadow: var(--shadow-card) !important;
  border: 1px solid rgba(15, 23, 42, 0.06) !important;
  animation: kpi-in 0.55s var(--ease-out) both;
  transition:
    box-shadow 0.3s var(--ease-out),
    border-color 0.25s ease;
}

.kpi:hover {
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(29, 78, 216, 0.18);
}

@keyframes kpi-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.kpi-ico {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.tone-blue {
  background: linear-gradient(135deg, #1e40af, #1d4ed8);
  box-shadow: 0 10px 28px rgba(29, 78, 216, 0.35);
}
.tone-slate {
  background: linear-gradient(135deg, #334155, #1e293b);
  box-shadow: 0 10px 26px rgba(30, 41, 59, 0.32);
}
.tone-amber {
  background: linear-gradient(135deg, #b45309, #d4a574);
  box-shadow: 0 10px 26px rgba(180, 83, 9, 0.28);
}
.tone-muted {
  background: linear-gradient(135deg, #475569, #64748b);
  box-shadow: 0 10px 24px rgba(71, 85, 105, 0.28);
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.kpi-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-top: 4px;
}

.kpi-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: minmax(300px, auto) minmax(320px, auto);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .chart-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
}

.chart-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.chart-card :deep(.el-card__body) {
  padding: 0;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.card-ico {
  font-size: 18px;
  color: #1d4ed8;
}

.card-sub {
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

@media (max-width: 960px) {
  .card-sub {
    margin-left: 0;
    width: 100%;
  }
}

.chart-host {
  height: 300px;
  width: 100%;
}

.chart-host-pie {
  height: 300px;
}

.chart-host-bar {
  height: 320px;
}

.chart-host-gauge {
  height: 280px;
}
</style>

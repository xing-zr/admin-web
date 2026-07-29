<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as Icons from '@element-plus/icons-vue'
import { ArrowDown, Close, Expand, Fold, Grid, Search, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useTabsStore } from '@/stores/tabs'
import { logout as logoutApi } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const active = computed(() => route.path)
const pageTitle = computed(() => (route.meta.title as string) || '')

const openTabs = computed(() => tabsStore.tabs)

const ASIDE_COLLAPSE_KEY = 'admin-aside-collapsed'
const asideCollapsed = ref(false)
const asideWidth = computed(() => (asideCollapsed.value ? '64px' : '232px'))

function toggleAside() {
  asideCollapsed.value = !asideCollapsed.value
}

function menuIcon(name?: string) {
  if (!name) return Icons.Menu
  const k = name as keyof typeof Icons
  return (Icons[k] as typeof Icons.Menu) || Icons.Menu
}

watch(
  () => ({ path: route.path, title: (route.meta.title as string) || '' }),
  (r) => {
    if (route.meta.public) return
    tabsStore.addTab({ path: r.path, title: r.title || '未命名' })
  },
  { immediate: true },
)

watch(asideCollapsed, (v) => {
  localStorage.setItem(ASIDE_COLLAPSE_KEY, v ? '1' : '0')
})

onMounted(() => {
  if (localStorage.getItem(ASIDE_COLLAPSE_KEY) === '1') {
    asideCollapsed.value = true
  }
})

async function logout() {
  try {
    await logoutApi()
  } catch {
    // 网络失败仍清理本地会话
  }
  userStore.clear()
  tabsStore.clear()
  router.push('/login')
}

function onUserCommand(cmd: string) {
  if (cmd === 'profile') router.push('/profile')
  if (cmd === 'logout') logout()
}

function goTab(path: string) {
  if (route.path !== path) router.push(path)
}

function closeTab(path: string) {
  const next = tabsStore.removeTab(path, route.path)
  if (next) router.push(next)
}

function tabIsActive(path: string) {
  return route.path === path || route.path.split('?')[0] === path
}

function onSearchClick() {
  ElMessage.info('搜索功能可对接全局检索')
}

function onSettingsClick() {
  ElMessage.info('系统设置')
}
</script>

<template>
  <el-container class="layout">
    <el-aside :width="asideWidth" class="aside" :class="{ 'is-collapsed': asideCollapsed }">
      <div class="aside-inner">
        <div class="brand" :class="{ 'is-collapsed': asideCollapsed }">
          <div class="brand-main">
            <div class="brand-mark">
              <el-icon :size="asideCollapsed ? 18 : 22"><Grid /></el-icon>
            </div>
            <div v-show="!asideCollapsed" class="brand-text">
              <span class="brand-name">控制台</span>
              <span class="brand-sub">Admin</span>
            </div>
          </div>
          <el-tooltip :content="asideCollapsed ? '展开侧栏' : '收起侧栏'" placement="right">
            <button type="button" class="sidebar-collapse" @click="toggleAside">
              <el-icon :size="asideCollapsed ? 16 : 18">
                <Fold v-if="!asideCollapsed" />
                <Expand v-else />
              </el-icon>
            </button>
          </el-tooltip>
        </div>
        <el-scrollbar class="menu-scroll">
          <el-menu
            class="side-menu"
            :default-active="active"
            :collapse="asideCollapsed"
            collapse-transition
            router
            :ellipsis="false"
          >
            <template v-for="m in userStore.menus" :key="m.id">
              <el-sub-menu v-if="m.children && m.children.length" :index="String(m.id)">
                <template #title>
                  <span class="menu-title">
                    <el-icon class="menu-ico"><component :is="menuIcon(m.icon)" /></el-icon>
                    <span class="menu-label">{{ m.name }}</span>
                  </span>
                </template>
                <el-menu-item v-for="c in m.children" :key="c.id" :index="c.path">
                  <el-icon class="menu-ico sub"><component :is="menuIcon(c.icon)" /></el-icon>
                  <span>{{ c.name }}</span>
                </el-menu-item>
              </el-sub-menu>
              <el-menu-item v-else :index="m.path">
                <el-icon class="menu-ico"><component :is="menuIcon(m.icon)" /></el-icon>
                <span>{{ m.name }}</span>
              </el-menu-item>
            </template>
          </el-menu>
        </el-scrollbar>
        <div class="aside-foot">
          <!-- <span v-if="!asideCollapsed" class="hint">JWT</span> -->
        </div>
      </div>
    </el-aside>
    <el-container class="right">
      <div class="top-wrap">
        <header class="header-row">
          <div class="header-row-left">
            <div class="header-brand-ico" aria-hidden="true">
              <el-icon :size="18"><Grid /></el-icon>
            </div>
            <h1 class="header-page-title font-display">{{ pageTitle }}</h1>
          </div>
          <div class="header-row-right">
            <div class="toolbar-pill" role="toolbar" aria-label="快捷操作">
              <el-button class="icon-btn" text circle @click="onSearchClick">
                <el-icon :size="18"><Search /></el-icon>
              </el-button>
              <span class="toolbar-divider" aria-hidden="true" />
              <el-button class="icon-btn" text circle @click="onSettingsClick">
                <el-icon :size="18"><Setting /></el-icon>
              </el-button>
            </div>
            <el-dropdown class="user-dropdown" trigger="click" @command="onUserCommand">
              <div class="user-trigger">
                <div class="avatar">
                  {{ (userStore.user?.nickname || userStore.user?.username || '?').slice(0, 1) }}
                </div>
                <span class="uname">{{ userStore.user?.nickname || userStore.user?.username }}</span>
                <el-icon class="caret"><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </header>

        <div class="tabs-bar">
          <el-scrollbar>
            <div class="tabs-inner">
              <button
                v-for="(tab, idx) in openTabs"
                :key="tab.path"
                type="button"
                class="tab-item"
                :class="{ 'is-active': tabIsActive(tab.path) }"
                :style="{ animationDelay: `${idx * 28}ms` }"
                @click="goTab(tab.path)"
              >
                <span class="tab-top-line" aria-hidden="true" />
                <span class="tab-label">{{ tab.title }}</span>
                <span
                  class="tab-close"
                  role="button"
                  tabindex="0"
                  title="关闭"
                  @click.stop="closeTab(tab.path)"
                  @keydown.enter.prevent.stop="closeTab(tab.path)"
                >
                  <el-icon :size="14"><Close /></el-icon>
                </span>
              </button>
            </div>
          </el-scrollbar>
        </div>
      </div>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background-color: var(--color-page-bg);
  background-image: var(--color-page-mesh);
}

.aside {
  height: 100%;
  align-self: stretch;
  background: linear-gradient(180deg, var(--color-sidebar) 0%, var(--color-sidebar-2) 100%);
  box-shadow: var(--shadow-sidebar);
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.3s var(--ease-out);
}

.aside::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(29, 78, 216, 0.5),
    rgba(245, 158, 11, 0.22) 45%,
    transparent 72%
  );
  pointer-events: none;
}

.aside-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.brand {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 12px 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: padding 0.3s var(--ease-out);
  flex-shrink: 0;
}

.brand-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.brand.is-collapsed {
  justify-content: space-between;
  padding: 12px 4px 14px;
  gap: 2px;
}

.brand.is-collapsed .brand-main {
  flex: 0;
  justify-content: flex-start;
}

.brand.is-collapsed .brand-mark {
  width: 30px;
  height: 30px;
}

.brand.is-collapsed .sidebar-collapse {
  width: 26px;
  height: 26px;
}

.sidebar-collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.sidebar-collapse:hover {
  background: rgba(29, 78, 216, 0.25);
  color: #fff;
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.35);
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1e40af 0%, #1d4ed8 45%, #f59e0b 155%);
  color: #fff;
  box-shadow: 0 8px 28px rgba(29, 78, 216, 0.42);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-family: 'Bricolage Grotesque', 'Noto Sans SC', sans-serif;
  color: #f8fafc;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.02em;
}

.brand-sub {
  color: rgba(226, 232, 240, 0.55);
  font-size: 12px;
}

.menu-scroll {
  flex: 1;
  min-height: 0;
  padding: 12px 10px 8px;
  overflow: hidden;
  transition: padding 0.3s var(--ease-out);
}

.aside.is-collapsed .menu-scroll {
  padding: 12px 6px 8px;
}

.menu-scroll :deep(.el-scrollbar__wrap) {
  max-height: 100%;
}

.menu-scroll :deep(.el-scrollbar__view) {
  padding-bottom: 8px;
}

.side-menu {
  border-right: none !important;
  background: transparent !important;
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.06);
  --el-menu-text-color: #cbd5e1;
  --el-menu-active-color: #fff;
}

.side-menu :deep(.el-sub-menu__title) {
  border-radius: 10px;
  margin-bottom: 4px;
  transition:
    background 0.25s var(--ease-out),
    transform 0.2s ease;
}

.side-menu :deep(.el-menu-item) {
  border-radius: 10px;
  margin: 2px 0;
  transition:
    background 0.25s var(--ease-out),
    transform 0.2s ease,
    color 0.2s ease;
}

.side-menu :deep(.el-menu-item:hover),
.side-menu :deep(.el-sub-menu__title:hover) {
  transform: translateX(2px);
}

.aside.is-collapsed .side-menu :deep(.el-menu-item:hover),
.aside.is-collapsed .side-menu :deep(.el-sub-menu__title:hover) {
  transform: none;
}

.side-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(29, 78, 216, 0.28), rgba(29, 78, 216, 0.05)) !important;
  color: #fff !important;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.45);
}

.menu-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.menu-ico {
  font-size: 17px;
}

.menu-ico.sub {
  font-size: 16px;
  opacity: 0.9;
}

.menu-label {
  font-weight: 500;
}

.aside-foot {
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.hint {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.6);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  display: block;
}

.right {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.top-wrap {
  flex-shrink: 0;
  position: relative;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, #ffffff 55%);
  backdrop-filter: blur(14px) saturate(1.08);
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  border-bottom: 1px solid rgba(15, 23, 42, 0.07);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 8px 28px -12px rgba(15, 23, 42, 0.12);
}

.top-wrap::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(29, 78, 216, 0.25) 20%,
    rgba(245, 158, 11, 0.2) 80%,
    transparent
  );
  pointer-events: none;
}

.header-row {
  height: 56px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px 0 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: transparent;
}

.header-row-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.header-brand-ico {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%);
  flex-shrink: 0;
  box-shadow:
    0 4px 14px rgba(29, 78, 216, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  transition: transform 0.35s var(--ease-spring);
}

.header-row-left:hover .header-brand-ico {
  transform: scale(1.03) rotate(-1.5deg);
}

.header-page-title {
  margin: 0;
  padding: 0;
  min-width: 0;
  flex: 1;
  text-align: left;
  font-size: clamp(1.05rem, 1.8vw, 1.2rem);
  font-weight: 700;
  color: #0c1220;
  letter-spacing: 0.01em;
  height: 38px;
  line-height: 38px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-row-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: rgba(15, 23, 42, 0.08);
  margin: 0 2px;
}

.icon-btn {
  color: #64748b !important;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s var(--ease-out) !important;
}

.icon-btn:hover {
  color: #1d4ed8 !important;
  background: rgba(29, 78, 216, 0.1) !important;
  transform: translateY(-1px);
}

.user-dropdown {
  margin-left: 2px;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 5px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.2s var(--ease-out);
}

.user-trigger:hover {
  border-color: rgba(29, 78, 216, 0.35);
  box-shadow:
    0 4px 16px rgba(29, 78, 216, 0.12),
    0 0 0 1px rgba(29, 78, 216, 0.08);
  transform: translateY(-1px);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(29, 78, 216, 0.3);
}

.uname {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  max-width: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caret {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
  transition: transform 0.25s var(--ease-out);
}

.user-trigger:hover .caret {
  color: #1d4ed8;
  transform: translateY(1px);
}

/* 多标签横条：浅蓝→白轨道，选中页白底 + 顶栏品牌蓝（对齐截图气质） */
.tabs-bar {
  --tab-blue: #1d4ed8;
  position: relative;
  padding: 0 16px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 42%, #f1f5f9 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.tabs-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 120% 80% at 50% 0%, rgba(29, 78, 216, 0.06), transparent 55%);
  opacity: 0.9;
}

.tabs-bar :deep(.el-scrollbar__wrap) {
  overflow-y: hidden;
}

.tabs-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 10px 2px 0;
  min-height: 42px;
}

.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  padding: 8px 10px 9px 14px;
  margin-bottom: -1px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #64748b;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  flex-shrink: 0;
  overflow: visible;
  animation: tab-in 0.38s var(--ease-out) both;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.22s ease;
}

@keyframes tab-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-item {
    animation: none;
  }
}

.tab-item:hover:not(.is-active) {
  color: #475569;
  background: rgba(255, 255, 255, 0.72);
  border-color: #d1d5db;
}

/* 顶栏指示：仅选中态显示，实色品牌蓝 */
.tab-top-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 0;
  background: var(--tab-blue);
  border-radius: 8px 8px 0 0;
  pointer-events: none;
  transition: height 0.2s var(--ease-out);
}

.tab-item.is-active {
  color: var(--tab-blue);
  font-weight: 600;
  background: #ffffff;
  border-color: #e5e7eb;
  border-top-color: transparent;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 1),
    0 -4px 18px -6px rgba(29, 78, 216, 0.12);
  z-index: 2;
}

.tab-item.is-active .tab-top-line {
  height: 3px;
}

.tab-label {
  position: relative;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 1px;
  padding: 3px;
  border-radius: 4px;
  color: #9ca3af;
  flex-shrink: 0;
  transition: color 0.18s ease, background 0.18s ease;
}

.tab-item.is-active .tab-close {
  color: #94a3b8;
}

.tab-close:hover {
  color: var(--tab-blue);
  background: rgba(29, 78, 216, 0.1);
}

.tab-item:not(.is-active) .tab-close:hover {
  color: #475569;
  background: rgba(15, 23, 42, 0.06);
}

.main {
  flex: 1;
  min-height: 0;
  padding: 22px;
  overflow: auto;
}
</style>

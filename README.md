# Admin Web

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](package.json)

基于 **Vue 3 + TypeScript + Vite + Element Plus** 的后台管理前端，与后端 [gin-api-admin](https://github.com/xing-zr/gin-api-admin) 配套使用。支持 JWT 登录、动态菜单路由、按钮级权限指令及完整的系统管理页面。

## 项目特性

- **Vue 3 Composition API**：`<script setup>` + TypeScript
- **动态路由**：登录后根据后端菜单树注册页面路由
- **权限控制**：路由守卫 + `v-permission` 指令（按钮级）
- **布局组件**：侧边栏、顶栏、多标签页（Tabs）
- **系统管理**：用户、角色、菜单、部门、权限
- **日志查看**：登录日志、操作日志、运行日志
- **工作台**：ECharts 数据概览仪表盘
- **开发代理**：Vite 将 `/api` 代理至后端服务

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [gin-api-admin](https://github.com/xing-zr/gin-api-admin) | Go 后端 API（需先启动） |
| [admin-web](https://github.com/xing-zr/admin-web)（本仓库） | Vue 3 管理端 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3、Vue Router 4 |
| 语言 | TypeScript |
| 构建 | Vite 5 |
| UI | Element Plus、@element-plus/icons-vue |
| 状态 | Pinia |
| HTTP | Axios |
| 图表 | ECharts 6 |

## 功能页面

| 模块 | 路径 | 说明 |
|------|------|------|
| 登录 | `/login` | 验证码 + 账号密码 |
| 工作台 | `/dashboard` | 统计图表与快捷入口 |
| 用户管理 | `/system/users` | 用户 CRUD |
| 角色管理 | `/system/roles` | 角色与菜单/权限分配 |
| 菜单管理 | `/system/menus` | 菜单树维护 |
| 部门管理 | `/system/depts` | 部门树维护 |
| 权限管理 | `/system/permissions` | 权限码维护 |
| 登录日志 | `/system/login-logs` | 登录记录查询 |
| 操作日志 | `/system/op-logs` | 后台操作审计 |
| 系统日志 | `/system/runtime-logs` | 运行日志在线查看 |

菜单与路由由后端返回，上表为种子数据中的默认配置。

## 环境要求

- Node.js **18+**（推荐 20 LTS）
- npm / pnpm / yarn 均可

后端需已部署并完成数据库迁移与种子初始化，详见 [gin-api-admin README](https://github.com/xing-zr/gin-api-admin#快速开始)。

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/xing-zr/admin-web.git
cd admin-web
npm install
```

### 2. 启动后端

在 [gin-api-admin](https://github.com/xing-zr/gin-api-admin) 仓库中配置并启动 API 服务（默认 `http://127.0.0.1:9801`）。

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问：`http://127.0.0.1:5173`

### 4. 登录

默认管理员账号（由后端种子数据创建）：

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |

## 开发配置

### API 代理

开发环境在 `vite.config.ts` 中将 `/api` 代理到后端：

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:9801',
      changeOrigin: true,
    },
  },
},
```

若后端地址或端口不同，请修改 `target`。

### 路径别名

`@` 指向 `src/`，可在导入时使用：

```typescript
import { useUserStore } from '@/stores/user'
```

### 新增菜单页面

1. 在后端菜单管理中配置 `component` 字段（如 `system/foo/index`）。
2. 在 `src/router/dynamic-routes.ts` 的 `menuComponentLoaders` 中注册组件映射。
3. 在 `src/views/` 下实现对应 Vue 页面。

## 目录结构

```text
admin-web/
├── public/                 # 静态资源
├── src/
│   ├── api/                # 接口封装（auth、admin、http）
│   ├── directives/         # 自定义指令（v-permission）
│   ├── layouts/            # 布局（MainLayout）
│   ├── router/             # 路由与动态菜单注册
│   ├── stores/             # Pinia（user、tabs）
│   ├── utils/              # 工具（menu、permission）
│   ├── views/              # 页面组件
│   │   ├── Login.vue
│   │   ├── Dashboard.vue
│   │   └── system/         # 系统管理各模块
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 生产部署

1. 构建静态资源：

```bash
npm run build
```

2. 将 `dist/` 目录部署至 Nginx、Caddy 等 Web 服务器。

3. 配置反向代理，将 `/api` 转发至后端服务，示例（Nginx）：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:9801;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location / {
    root /path/to/admin-web/dist;
    try_files $uri $uri/ /index.html;
}
```

4. 确保后端 CORS 或同域代理配置正确，避免跨域问题。

## 参与贡献

欢迎提交 Issue 与 Pull Request。新增页面时请同步更新 `dynamic-routes.ts` 中的组件映射。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。

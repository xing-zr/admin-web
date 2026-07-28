import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { setupPermissionDirective } from './directives/permission'
import { TOKEN_KEY } from './utils/session'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
setupPermissionDirective(app)
app.mount('#app')

window.addEventListener('storage', (e) => {
  if (e.key !== TOKEN_KEY || e.newValue) return
  void Promise.all([import('./stores/user'), import('./stores/tabs')]).then(
    ([{ useUserStore }, { useTabsStore }]) => {
      useUserStore().clear()
      useTabsStore().clear()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    },
  )
})

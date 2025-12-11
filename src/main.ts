import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import 'jordium-gantt-vue3/dist/assets/jordium-gantt-vue3.css'
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

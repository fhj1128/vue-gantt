import { createApp } from 'vue'
import { createPinia } from 'pinia'

import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isBetween from 'dayjs/plugin/isBetween.js'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

import App from './App.vue'
import router from './router'
import 'jordium-gantt-vue3/dist/assets/jordium-gantt-vue3.css'
const app = createApp(App)

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isBetween)
dayjs.extend(customParseFormat)
dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.extend(advancedFormat)

app.use(createPinia())
app.use(router)

app.mount('#app')

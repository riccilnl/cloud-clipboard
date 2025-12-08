import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import Device from './views/Device.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/device',
    name: 'Device',
    component: Device
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

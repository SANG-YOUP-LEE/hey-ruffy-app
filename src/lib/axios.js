// src/lib/axios.js
import axios from 'axios'
import { topLoaderStart, topLoaderDone } from '@/lib/topLoader'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  topLoaderStart('data')
  return cfg
})

api.interceptors.response.use(
  res => {
    topLoaderDone('data')
    return res
  },
  err => {
    topLoaderDone('data')
    return Promise.reject(err)
  }
)

export default api

// src/utils/request.js
import axios from 'axios'

const service = axios.create({
  baseURL: 'http://192.168.125.2:8101/api',  // 写死的统一 API 地址
  timeout: 5000
})

service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      // 根据接口要求设置token，参数名为exam-token
      config.headers['exam-token'] = token
    }
    return config
  },
  error => Promise.reject(error)
)

service.interceptors.response.use(
  response => response.data,
  error => {
    console.error('请求出错：', error)
    return Promise.reject(error)
  }
)

export default service

import axios from 'axios'

export const api = axios.create({
  // Беремо URL зі змінних середовища.
  // Якщо немає (локальна розробка) — падаємо на 5050 порт.
  // Якщо в Docker (через Nginx) — падаємо на 80 порт.
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api',
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('blog-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})
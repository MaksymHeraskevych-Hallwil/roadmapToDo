'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { ApiError } from '@/lib/api'
import type { AuthResponse } from '@/types'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()

  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isLoginMode) {
        const res = await api.post<AuthResponse>('/auth/login', { email, password })
        login(res.user, res.token)
      } else {
        // Реєстрація токена не повертає — після неї одразу логінимось
        await api.post('/auth/register', { email, password, name })
        const res = await api.post<AuthResponse>('/auth/login', { email, password })
        login(res.user, res.token)
      }
      router.push('/')
    } catch (err) {
      // Бекенд на 400 віддає details зі списком полів — показуємо перше,
      // бо воно конкретніше за загальне «Некоректні дані».
      const apiError = err instanceof ApiError ? err : null
      setError(
        apiError?.data?.details?.[0]?.message ||
          (err instanceof Error ? err.message : 'Помилка')
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h2 className="text-3xl font-black text-blue-600 mb-8">
          {isLoginMode ? 'Вхід' : 'Реєстрація'}
        </h2>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <input 
              className="w-full p-3 border rounded-lg bg-gray-50" 
              placeholder="Ім'я" 
              onChange={(e) => setName(e.target.value)} 
            />
          )}
          <input 
            className="w-full p-3 border rounded-lg bg-gray-50" 
            placeholder="Email" 
            type="email"
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            className="w-full p-3 border rounded-lg bg-gray-50" 
            placeholder="Пароль" 
            type="password"
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700">
            {isLoginMode ? 'Увійти' : 'Зареєструватись'}
          </button>
        </form>

        <button 
          onClick={() => setIsLoginMode(!isLoginMode)}
          className="mt-6 text-sm text-blue-500 font-bold block w-full text-center"
        >
          {isLoginMode ? 'Створити акаунт' : 'Вже маю акаунт'}
        </button>
      </div>
    </div>
  )
}
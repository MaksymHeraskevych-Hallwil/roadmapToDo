import { create } from 'zustand'

// Описуємо як виглядає наш користувач
interface User {
  id: number
  email: string
  name: string | null
}

// Описуємо структуру всього стора
interface AuthState {
  user: User | null
  token: string | null
  // Функція яка оновлює стан після логіну
  login: (user: User, token: string) => void
  // Функція для розлогіну
  logout: () => void
}

// Створюємо стор 
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  login: (user, token) => {
    // Зберігаємо в стан
    set({ user, token })
    // І відразу в LocalStorage браузера, щоб після рефрешу не зникало
    if (typeof window !== 'undefined') {
      localStorage.setItem('blog-token', token)
      localStorage.setItem('blog-user', JSON.stringify(user))
    }
  },

  logout: () => {
    set({ user: null, token: null })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('blog-token')
      localStorage.removeItem('blog-user')
    }
  },
}))
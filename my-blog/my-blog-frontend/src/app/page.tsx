'use client'

import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Home() {
  const { user, login, logout } = useAuthStore()

  useEffect(() => {
    const savedToken = localStorage.getItem('blog-token')
    const savedUser = localStorage.getItem('blog-user')
    if (savedToken && savedUser) {
      login(JSON.parse(savedUser), savedToken)
    }
  }, [login])

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <nav className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600">MY BLOG</h1>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <span className="text-sm text-neutral-600">Hi, {user.name}</span>
                <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700">Вийти</button>
              </>
            ) : (
              <Link href="/login" className="px-5 py-2 rounded-full bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-700">Увійти</Link>
            )}
          </div>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-neutral-950 mb-4 tracking-tight">Ідеї та роздуми про технології</h1>
          <p className="text-lg text-neutral-600">Сучасний блог на Next.js, Express та PostgreSQL.</p>
        </div>

        <div className="grid gap-6">
          <article className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm hover:border-blue-300 transition">
            <h2 className="text-2xl font-bold mb-2">Наш перший пост</h2>
            <p className="text-neutral-600 mb-4">Блог успішно налаштований і готовий до нотаток!</p>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Технології</span>
          </article>
        </div>
      </section>
    </main>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import type { Post, PaginationMeta, Paginated } from '@/types'

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const { user, login } = useAuthStore()

  // --- ВАЖЛИВИЙ КРОК: Відновлення сесії ---
  // Робимо це в ефекті, а не при створенні стора: localStorage не існує
  // під час серверного рендеру, і читання при ініціалізації дало б
  // розбіжність між серверною та клієнтською розміткою.
  useEffect(() => {
    const savedToken = localStorage.getItem('blog-token')
    const savedUser = localStorage.getItem('blog-user')
    if (savedToken && savedUser) {
      login(JSON.parse(savedUser), savedToken)
    }
  }, [login])
  // ----------------------------------------

  // API тепер віддає { data, meta } — сторінку тримаємо в стані
  const fetchPosts = useCallback(async () => {
    const res = await api.get<Paginated<Post>>(`/posts?page=${page}`)
    setPosts(res.data)
    setMeta(res.meta)
  }, [page])

  // Завантаження даних після монтування — стан оновлюється вже після
  // відповіді сервера, тобто асинхронно. Правило цього не розрізняє.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPosts()
  }, [fetchPosts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/posts', { title, content })
      setTitle('')
      setContent('')
      // Новий пост завжди зверху — повертаємось на першу сторінку
      if (page === 1) {
        fetchPosts()
      } else {
        setPage(1)
      }
    } catch (err) {
      // Бекенд повертає details зі списком полів — показуємо перше
      const apiError = err instanceof ApiError ? err : null
      setError(
        apiError?.data?.details?.[0]?.message ||
          (err instanceof Error ? err.message : 'Помилка')
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Блог</h1>

      {user ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border mb-8">
          <input
            className="w-full border p-2 mb-2 rounded"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border p-2 mb-2 rounded"
            placeholder="Вміст"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Створити пост</button>
        </form>
      ) : (
        <p className="text-gray-500 mb-8">Увійдіть, щоб створити пост.</p>
      )}

      {/* Список постів */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white p-6 rounded-xl border">
            <h2 className="text-xl font-bold">{post.title}</h2>
            <p className="text-gray-700">{post.content}</p>

            <Link
              href={`/posts/${post.id}`}
              className="text-blue-500 font-bold block mt-3"
            >
              Читати далі →
            </Link>

            <p className="text-xs text-gray-400 mt-2">Автор: {post.author.name}</p>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="text-gray-500 text-center py-8">Постів поки немає.</p>
      )}

      {/* Пагінація — показуємо, тільки якщо сторінок більше однієї */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={meta.page <= 1}
            className="px-4 py-2 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Новіші
          </button>

          <span className="text-sm text-gray-500">
            Сторінка {meta.page} з {meta.totalPages} · всього {meta.total}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={meta.page >= meta.totalPages}
            className="px-4 py-2 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Старіші →
          </button>
        </div>
      )}
    </div>
  )
}

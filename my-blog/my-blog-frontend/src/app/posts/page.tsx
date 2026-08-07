'use client'

import { useEffect, useState } from 'react' // Додаємо useEffect
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  
  // Додаємо деструктуризацію login, щоб він був доступний
  const { user, login } = useAuthStore()

  // --- ВАЖЛИВИЙ КРОК: Відновлення сесії ---
  useEffect(() => {
    const savedToken = localStorage.getItem('blog-token')
    const savedUser = localStorage.getItem('blog-user')
    if (savedToken && savedUser) {
      login(JSON.parse(savedUser), savedToken)
    }
  }, [login])
  // ----------------------------------------

  const fetchPosts = async () => {
    const res = await api.get('/posts')
    setPosts(res.data)
  }

  useEffect(() => { fetchPosts() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/posts', { title, content })
    setTitle('')
    setContent('')
    fetchPosts()
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Блог</h1>
      
      {/* Тепер тут буде форма, як тільки user завантажиться в стор */}
      {user ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border mb-8">
          <input className="w-full border p-2 mb-2 rounded" placeholder="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full border p-2 mb-2 rounded" placeholder="Вміст" value={content} onChange={(e) => setContent(e.target.value)} />
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
            
            {/* ДОДАЙТЕ ЦЕЙ ЛІНК: */}
            <Link href={`/posts/${post.id}`} className="text-blue-500 font-bold block mt-3">
                Читати далі →
            </Link>
            
            <p className="text-xs text-gray-400 mt-2">Автор: {post.author.name}</p>
            </div>
        ))}
        </div>
    </div>
  )
}

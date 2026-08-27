'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { PostWithComments } from '@/types'

export default function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<PostWithComments | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const { user } = useAuthStore()

  const fetchPost = useCallback(async () => {
    const data = await api.get<PostWithComments>(`/posts/${id}`)
    setPost(data)
  }, [id])

  // Дані підвантажуються після монтування, стан оновлюється вже
  // після відповіді сервера — правило цього не розрізняє.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPost()
  }, [fetchPost])

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/comments', { postId: id, content: comment })
      setComment('')
      fetchPost()
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null
      setError(
        apiError?.data?.details?.[0]?.message ||
          (err instanceof Error ? err.message : 'Помилка')
      )
    }
  }

  if (!post) return <div>Завантаження...</div>

  return (
    <div className="max-w-2xl mx-auto p-8">
      {post.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.image.url}
          alt={post.title}
          className="w-full max-h-96 object-cover rounded-xl mb-6"
        />
      )}
      <h1 className="text-4xl font-bold">{post.title}</h1>
      <p className="mt-4 text-lg">{post.content}</p>

      <hr className="my-8" />

      <h2 className="text-2xl font-bold mb-4">Коментарі</h2>
      {post.comments.length === 0 && (
        <p className="text-gray-500">Коментарів поки немає.</p>
      )}
      {post.comments.map((c) => (
        <div key={c.id} className="bg-gray-50 p-4 rounded mb-2">
          <p>{c.content}</p>
          <span className="text-xs text-gray-500">Автор: {c.author.name}</span>
        </div>
      ))}

      {user && (
        <form onSubmit={handleComment} className="mt-6">
          <textarea
            className="w-full border p-2 rounded"
            placeholder="Ваш коментар..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <button className="bg-green-600 text-white px-4 py-2 mt-2 rounded">
            Коментувати
          </button>
        </form>
      )}
    </div>
  )
}

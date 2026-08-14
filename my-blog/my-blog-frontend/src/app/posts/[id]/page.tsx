'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [comment, setComment] = useState('')
  const { user } = useAuthStore()

  const fetchPost = async () => {
    const data = await api.get(`/posts/${id}`)
    setPost(data)
  }

  useEffect(() => { fetchPost() }, [id])

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/comments', { postId: id, content: comment })
    setComment('')
    fetchPost()
  }

  if (!post) return <div>Завантаження...</div>

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-4xl font-bold">{post.title}</h1>
      <p className="mt-4 text-lg">{post.content}</p>
      
      <hr className="my-8" />
      
      <h2 className="text-2xl font-bold mb-4">Коментарі</h2>
      {post.comments.map((c: any) => (
        <div key={c.id} className="bg-gray-50 p-4 rounded mb-2">
          <p>{c.content}</p>
          <span className="text-xs text-gray-500">Автора: {c.author.name}</span>
        </div>
      ))}

      {user && (
        <form onSubmit={handleComment} className="mt-6">
          <textarea className="w-full border p-2 rounded" placeholder="Ваш коментар..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="bg-green-600 text-white px-4 py-2 mt-2 rounded">Коментувати</button>
        </form>
      )}
    </div>
  )
}
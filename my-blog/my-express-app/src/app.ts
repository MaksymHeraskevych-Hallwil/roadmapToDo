import express from 'express'
import cors from 'cors'

import { redis } from './lib/cache'
import authRoutes from './routes/auth.routes'
import postsRoutes from './routes/posts.routes'
import commentsRoutes from './routes/comments.routes'

// Тут ми тільки збираємо застосунок, але НЕ піднімаємо сервер.
// Завдяки цьому інтеграційні тести можуть передати `app` у supertest
// без реального відкриття порту.
const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/comments', commentsRoutes)

// Головна
app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running', version: '1.0' })
})

// Healthcheck для Docker / Nginx.
// Окремо показуємо стан Redis: застосунок лишається 'ok' навіть коли
// кеш лежить — це навмисно, кеш не є критичною залежністю.
app.get('/api/health', async (req, res) => {
  let cache = 'disabled'
  if (redis) {
    try {
      cache = (await redis.ping()) === 'PONG' ? 'up' : 'down'
    } catch {
      cache = 'down'
    }
  }
  res.json({ status: 'ok', cache })
})

export default app

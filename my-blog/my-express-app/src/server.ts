import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5050

// Middleware
app.use(cors())
app.use(express.json())

// Routes
import authRoutes from './routes/auth.routes'
import postsRoutes from './routes/posts.routes'
import commentsRoutes from './routes/comments.routes'

app.use('/api/auth', authRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/comments', commentsRoutes)

// Головна
app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running', version: '1.0' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Отримати всі пости
export const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Помилка при отриманні постів' })
  }
}

// Отримати один пост
export const getPost = async (req, res) => {
  try {
    const { id } = req.params
    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
      include: {
        author: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!post) return res.status(404).json({ error: 'Пост не знайдено' })
    res.json(post)
  } catch (error) {
    res.status(500).json({ error: 'Помилка' })
  }
}

// Створити пост
export const createPost = async (req, res) => {
  try {
    const { title, content } = req.body
    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: req.user.userId,
      },
    })
    res.status(201).json(post)
  } catch (error) {
    res.status(500).json({ error: 'Помилка при створенні поста' })
  }
}

// Оновити пост (тільки автор)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content } = req.body

    const post = await prisma.post.findUnique({ where: { id: Number(id) } })
    if (!post) return res.status(404).json({ error: 'Пост не знайдено' })
    if (post.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'Тільки автор може редагувати' })
    }

    const updated = await prisma.post.update({
      where: { id: Number(id) },
      data: { title, content },
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Помилка при оновленні' })
  }
}

// Видалити пост (тільки автор)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params

    const post = await prisma.post.findUnique({ where: { id: Number(id) } })
    if (!post) return res.status(404).json({ error: 'Пост не знайдено' })
    if (post.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'Тільки автор може видалити' })
    }

    await prisma.post.delete({ where: { id: Number(id) } })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Помилка при видаленні' })
  }
}
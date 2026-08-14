import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { cacheDel, cacheKeys } from '../lib/cache'

// Створити коментар
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId, content } = req.body
    const comment = await prisma.comment.create({
      data: {
        content,
        postId: Number(postId),
        authorId: req.user.userId,
      },
      include: { author: { select: { id: true, name: true } } },
    })

    // GET /posts/:id віддає пост разом з коментарями — його кеш застарів
    await cacheDel(cacheKeys.post(comment.postId))

    res.status(201).json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Помилка при створенні коментаря' })
  }
}

// Оновити коментар (тільки автор)
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body

    const comment = await prisma.comment.findUnique({ where: { id: Number(id) } })
    if (!comment) return res.status(404).json({ error: 'Коментар не знайдено' })
    if (comment.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'Тільки автор може редагувати' })
    }

    const updated = await prisma.comment.update({
      where: { id: Number(id) },
      data: { content },
    })

    await cacheDel(cacheKeys.post(comment.postId))

    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Помилка' })
  }
}

// Видалити коментар (автор або автор поста)
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const comment = await prisma.comment.findUnique({
      where: { id: Number(id) },
      include: { post: true },
    })
    if (!comment) return res.status(404).json({ error: 'Коментар не знайдено' })

    const canDelete = comment.authorId === req.user.userId || comment.post.authorId === req.user.userId
    if (!canDelete) {
      return res.status(403).json({ error: 'Немає прав на видалення' })
    }

    await prisma.comment.delete({ where: { id: Number(id) } })

    await cacheDel(cacheKeys.post(comment.postId))

    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Помилка' })
  }
}

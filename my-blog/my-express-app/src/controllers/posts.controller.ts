import prisma from '../lib/prisma'
import { cacheGet, cacheSet, cacheDel, cacheKeys } from '../lib/cache'

// Отримати всі пости
export const getAllPosts = async (req, res) => {
  try {
    // 1. Спершу питаємо кеш (cache-aside / read-through)
    const cached = await cacheGet(cacheKeys.postsList)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

    // 2. Промах — йдемо в базу
    const posts = await prisma.post.findMany({
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // 3. І кладемо результат у кеш для наступних запитів
    await cacheSet(cacheKeys.postsList, posts)

    res.set('X-Cache', 'MISS')
    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: 'Помилка при отриманні постів' })
  }
}

// Отримати один пост
export const getPost = async (req, res) => {
  try {
    const { id } = req.params

    const cached = await cacheGet(cacheKeys.post(id))
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

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

    // Кешуємо тільки успішні відповіді: 404 в кеші означав би, що
    // щойно створений пост «не існує» ще цілу хвилину.
    await cacheSet(cacheKeys.post(id), post)

    res.set('X-Cache', 'MISS')
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

    // Список змінився — старий кеш більше не валідний
    await cacheDel(cacheKeys.postsList)

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

    // Змінився і сам пост, і його рядок у списку
    await cacheDel(cacheKeys.postsList, cacheKeys.post(id))

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

    await cacheDel(cacheKeys.postsList, cacheKeys.post(id))

    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Помилка при видаленні' })
  }
}

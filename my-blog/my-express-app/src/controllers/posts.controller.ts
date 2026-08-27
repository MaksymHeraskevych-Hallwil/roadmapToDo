import prisma from '../lib/prisma'
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheKeys,
  getListVersion,
  bumpListVersion,
} from '../lib/cache'

/** Чи належить зображення цьому користувачу */
const ownsMedia = async (imageId: number, userId: number): Promise<boolean> => {
  const media = await prisma.media.findUnique({ where: { id: imageId } })
  return Boolean(media && media.authorId === userId)
}

// Отримати пости посторінково
export const getAllPosts = async (req, res) => {
  try {
    // page і limit уже перевірені й приведені до чисел у middleware
    const { page, limit } = req.validatedQuery
    const skip = (page - 1) * limit

    // Ключ кешу включає версію списку: при зміні даних версія
    // зростає, і всі закешовані сторінки стають недосяжними.
    const version = await getListVersion()
    const key = version ? cacheKeys.postsList(version, page, limit) : null

    if (key) {
      const cached = await cacheGet(key)
      if (cached) {
        res.set('X-Cache', 'HIT')
        return res.json(cached)
      }
    }

    // Один запит за даними сторінки, другий — за загальною кількістю.
    // Разом, бо вони незалежні.
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        include: {
          author: { select: { id: true, name: true } },
          image: { select: { id: true, url: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count(),
    ])

    const payload = {
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }

    if (key) await cacheSet(key, payload)

    res.set('X-Cache', 'MISS')
    res.json(payload)
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
        image: { select: { id: true, url: true } },
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
    const { title, content, imageId } = req.body

    // Чужу картинку до свого поста не причепиш
    if (imageId && !(await ownsMedia(imageId, req.user.userId))) {
      return res.status(403).json({ error: 'Це зображення належить іншому користувачу' })
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: req.user.userId,
        imageId: imageId ?? null,
      },
      include: { image: { select: { id: true, url: true } } },
    })

    // Список змінився — усі закешовані сторінки більше не валідні
    await bumpListVersion()

    res.status(201).json(post)
  } catch (error) {
    res.status(500).json({ error: 'Помилка при створенні поста' })
  }
}

// Оновити пост (тільки автор)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, imageId } = req.body

    const post = await prisma.post.findUnique({ where: { id: Number(id) } })
    if (!post) return res.status(404).json({ error: 'Пост не знайдено' })
    if (post.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'Тільки автор може редагувати' })
    }

    if (imageId && !(await ownsMedia(imageId, req.user.userId))) {
      return res.status(403).json({ error: 'Це зображення належить іншому користувачу' })
    }

    const updated = await prisma.post.update({
      where: { id: Number(id) },
      // imageId undefined — поле не чіпаємо, null — прибираємо обкладинку
      data: { title, content, ...(imageId !== undefined && { imageId }) },
      include: { image: { select: { id: true, url: true } } },
    })

    // Змінився і сам пост, і його рядок у списку
    await Promise.all([bumpListVersion(), cacheDel(cacheKeys.post(id))])

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

    await Promise.all([bumpListVersion(), cacheDel(cacheKeys.post(id))])

    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Помилка при видаленні' })
  }
}

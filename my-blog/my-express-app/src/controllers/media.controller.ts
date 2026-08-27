import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import {
  isStorageEnabled,
  uploadObject,
  deleteObject,
  detectImageType,
  buildObjectKey,
  ALLOWED_IMAGE_TYPES,
} from '../lib/storage'

// Завантажити зображення
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!isStorageEnabled) {
      return res.status(503).json({ error: 'Сховище не налаштоване' })
    }

    const file = (req as any).file
    if (!file) {
      return res.status(400).json({ error: 'Файл не надіслано' })
    }

    // Тип визначаємо за вмістом файлу, а не за заголовком від клієнта
    const mimeType = detectImageType(file.buffer)
    if (!mimeType || !ALLOWED_IMAGE_TYPES[mimeType]) {
      return res.status(400).json({
        error: 'Дозволені лише зображення: JPEG, PNG, WebP, GIF',
      })
    }

    const key = buildObjectKey(mimeType)
    const url = await uploadObject(key, file.buffer, mimeType)

    const media = await prisma.media.create({
      data: {
        key,
        url,
        mimeType,
        size: file.size,
        authorId: req.user!.userId,
      },
    })

    res.status(201).json(media)
  } catch (error) {
    console.error('UPLOAD ERROR:', error)
    res.status(500).json({ error: 'Помилка при завантаженні файлу' })
  }
}

// Видалити зображення (тільки той, хто завантажив)
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const media = await prisma.media.findUnique({ where: { id: Number(id) } })
    if (!media) return res.status(404).json({ error: 'Файл не знайдено' })
    if (media.authorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Немає прав на видалення' })
    }

    // Спершу з бази, потім зі сховища: осиротілий файл у бакеті — це
    // марно витрачені байти, а осиротілий запис у БД — битий URL у UI.
    await prisma.media.delete({ where: { id: Number(id) } })
    await deleteObject(media.key)

    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Помилка при видаленні файлу' })
  }
}

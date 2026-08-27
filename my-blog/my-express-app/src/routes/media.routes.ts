import express from 'express'
import multer from 'multer'
import { uploadMedia, deleteMedia } from '../controllers/media.controller'
import authMiddleware from '../middlewares/auth.middleware'
import validate from '../middlewares/validate.middleware'
import { idParamSchema } from '../schemas'
import { MAX_FILE_SIZE } from '../lib/storage'

const router = express.Router()

/**
 * Файл тримаємо в пам'яті, а не на диску: він одразу їде в R2/MinIO,
 * тож писати його на диск контейнера немає сенсу.
 * Обмеження розміру тут — перша лінія: multer обірве запит, не
 * дочитуючи його до кінця.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

// POST /api/media — завантажити зображення (поле форми: "file")
router.post('/', authMiddleware, upload.single('file'), uploadMedia)

// DELETE /api/media/:id
router.delete(
  '/:id',
  authMiddleware,
  validate(idParamSchema, 'params'),
  deleteMedia
)

// Multer кидає власні помилки (наприклад, перевищений розмір) —
// без цього обробника вони перетворились би на 500.
router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `Файл завеликий. Максимум ${MAX_FILE_SIZE / 1024 / 1024} МБ`,
      })
    }
    return res.status(400).json({ error: 'Помилка завантаження файлу' })
  }
  next(err)
})

export default router

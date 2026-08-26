import { z } from 'zod'

/**
 * Схеми вхідних даних.
 *
 * Досі бекенд вірив клієнту на слово: можна було створити пост із
 * порожнім заголовком або зареєструватись з паролем "1". База такі
 * дані приймає — вона стежить за типами й звʼязками, а не за здоровим
 * глуздом. Це робота застосунку.
 */

// ── Автентифікація ───────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некоректний email'),
  password: z
    .string()
    .min(8, 'Пароль має бути щонайменше 8 символів')
    .max(72, 'Пароль задовгий'), // bcrypt ігнорує все після 72 байтів
  name: z.string().trim().min(1).max(60).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некоректний email'),
  password: z.string().min(1, 'Введіть пароль'),
})

// ── Пости ────────────────────────────────────────────────────────
export const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Заголовок не може бути порожнім').max(200),
  content: z.string().trim().min(1, 'Текст не може бути порожнім').max(50_000),
})

// При оновленні дозволяємо надіслати лише частину полів,
// але хоча б одне має бути.
export const updatePostSchema = createPostSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Треба передати хоча б одне поле для оновлення' }
)

// ── Коментарі ────────────────────────────────────────────────────
export const createCommentSchema = z.object({
  // З форми postId може прийти рядком — приводимо до числа
  postId: z.coerce.number().int().positive('Некоректний id поста'),
  content: z.string().trim().min(1, 'Коментар не може бути порожнім').max(5_000),
})

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Коментар не може бути порожнім').max(5_000),
})

// ── Параметри запиту ─────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Верхня межа навмисна: без неї ?limit=1000000 обходив би пагінацію
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Некоректний id'),
})

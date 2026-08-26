import { ZodType } from 'zod'

type Source = 'body' | 'query' | 'params'

/**
 * Перевіряє частину запиту за схемою zod.
 *
 * При успіху кладе розібрані (і приведені до типів) дані назад у req —
 * далі контролер працює вже з числами, а не з рядками з URL.
 * При помилці відповідає 400 зі списком полів, не пускаючи запит далі.
 *
 * Використання: router.post('/', validate(createPostSchema), createPost)
 */
export const validate =
  (schema: ZodType, source: Source = 'body') =>
  (req: any, res: any, next: any) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      return res.status(400).json({
        error: 'Некоректні дані',
        // Плаский список {поле: повідомлення} — фронтенду зручно
        // підсвітити конкретні інпути.
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        })),
      })
    }

    // req.query в Express 5 доступний тільки для читання,
    // тому кладемо розібрані значення в окреме поле.
    if (source === 'query') {
      req.validatedQuery = result.data
    } else {
      req[source] = result.data
    }

    next()
  }

export default validate

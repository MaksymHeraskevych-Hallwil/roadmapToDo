import Redis from 'ioredis'

/**
 * Кеш-шар на Redis.
 *
 * Головний принцип: Redis — це НЕ база даних, а прискорювач. Якщо він
 * лежить, застосунок мусить працювати далі, просто повільніше. Тому
 * кожна операція обгорнута в try/catch і при помилці поводиться так,
 * ніби в кеші нічого не було.
 */

const REDIS_URL = process.env.REDIS_URL

// Без REDIS_URL просто працюємо без кешу — зручно для юніт-тестів
// і для локального запуску без Docker.
export const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      // Не намагатись перепідключатись вічно, якщо Redis не піднявся:
      // краще швидко впасти в catch і піти в базу.
      maxRetriesPerRequest: 2,
      // Не тримати процес живим через відкритий сокет
      enableOfflineQueue: false,
    })
  : null

if (redis) {
  // Без цього обробника ioredis кине unhandled error і покладе процес,
  // коли Redis недоступний.
  redis.on('error', (err) => {
    console.warn('[cache] Redis недоступний:', err.message)
  })
}

/** TTL за замовчуванням — 60 секунд. */
export const DEFAULT_TTL = 60

/**
 * Дістати значення з кешу. Повертає null і при промаху,
 * і при будь-якій помилці Redis — виклику це однаково.
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (error) {
    return null
  }
}

/** Покласти значення в кеш із часом життя. */
export const cacheSet = async (
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL
): Promise<void> => {
  if (!redis) return
  try {
    // EX — час життя в секундах. Ключ зникне сам, навіть якщо ми
    // забудемо його інвалідувати: TTL тут як страхувальна сітка.
    await redis.set(key, JSON.stringify(value), 'EX', ttl)
  } catch (error) {
    // Не змогли закешувати — не привід ламати запит
  }
}

/** Видалити ключі з кешу (інвалідація після зміни даних). */
export const cacheDel = async (...keys: string[]): Promise<void> => {
  if (!redis || keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch (error) {
    // Найгірше, що станеться — читач ще до TTL побачить старі дані
  }
}

/**
 * Імена ключів тримаємо в одному місці, щоб інвалідація не розʼїхалась
 * із читанням через друкарську помилку в рядку.
 */
export const cacheKeys = {
  postsList: 'posts:list',
  post: (id: number | string) => `post:${id}`,
}

/** Закрити зʼєднання — потрібно тестам, щоб Jest не висів. */
export const cacheDisconnect = async (): Promise<void> => {
  if (redis) await redis.quit().catch(() => undefined)
}

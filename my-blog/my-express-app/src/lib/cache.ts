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
  listVersion: 'posts:list:version',
  postsList: (version: number, page: number, limit: number) =>
    `posts:list:v${version}:p${page}:l${limit}`,
  post: (id: number | string) => `post:${id}`,
}

/**
 * З пагінацією кеш списку — це не один ключ, а по ключу на кожну
 * комбінацію сторінки й розміру. Видаляти їх поштучно неможливо,
 * а бігати по базі через KEYS/SCAN на кожен новий пост — дорого.
 *
 * Тому в ключ вшито номер версії. Щоб «скинути весь список»,
 * достатньо збільшити версію на одиницю: старі ключі стають
 * недосяжними й тихо помирають за TTL.
 */
export const getListVersion = async (): Promise<number | null> => {
  if (!redis) return null
  try {
    const current = await redis.get(cacheKeys.listVersion)
    if (current) return Number(current)
    await redis.set(cacheKeys.listVersion, '1')
    return 1
  } catch (error) {
    // Redis лежить — працюємо без кешу
    return null
  }
}

/** Зробити всі закешовані сторінки списку недійсними. */
export const bumpListVersion = async (): Promise<void> => {
  if (!redis) return
  try {
    await redis.incr(cacheKeys.listVersion)
  } catch (error) {
    // Найгірше — читач до TTL побачить старий список
  }
}

/** Закрити зʼєднання — потрібно тестам, щоб Jest не висів. */
export const cacheDisconnect = async (): Promise<void> => {
  if (redis) await redis.quit().catch(() => undefined)
}

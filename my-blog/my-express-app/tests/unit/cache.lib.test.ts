// Підміняємо сам ioredis — справжній Redis для цих тестів не потрібен
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => require('../helpers/redisMock').redisMock),
}))

import { redisMock } from '../helpers/redisMock'

// cache.ts читає process.env.REDIS_URL на етапі імпорту,
// тому підвантажуємо його вже після того, як env виставлено.
let cache: typeof import('../../src/lib/cache')

describe('кеш-шар (src/lib/cache.ts)', () => {
  beforeAll(() => {
    process.env.REDIS_URL = 'redis://fake:6379'
    cache = require('../../src/lib/cache')
  })

  beforeEach(() => {
    redisMock.get.mockReset()
    redisMock.set.mockReset()
    redisMock.del.mockReset()
  })

  describe('cacheGet', () => {
    it('розпарсює JSON зі значення', async () => {
      redisMock.get.mockResolvedValue('{"id":1,"title":"Пост"}')

      await expect(cache.cacheGet('post:1')).resolves.toEqual({
        id: 1,
        title: 'Пост',
      })
    })

    it('повертає null, якщо ключа немає', async () => {
      redisMock.get.mockResolvedValue(null)

      await expect(cache.cacheGet('post:1')).resolves.toBeNull()
    })

    it('повертає null, якщо Redis впав — помилка назовні не летить', async () => {
      redisMock.get.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(cache.cacheGet('post:1')).resolves.toBeNull()
    })

    it('повертає null на побите значення в кеші', async () => {
      redisMock.get.mockResolvedValue('{не JSON')

      await expect(cache.cacheGet('post:1')).resolves.toBeNull()
    })
  })

  describe('cacheSet', () => {
    it('серіалізує значення і ставить TTL у секундах', async () => {
      redisMock.set.mockResolvedValue('OK')

      await cache.cacheSet('post:1', { id: 1 }, 120)

      expect(redisMock.set).toHaveBeenCalledWith('post:1', '{"id":1}', 'EX', 120)
    })

    it('за замовчуванням TTL 60 секунд', async () => {
      redisMock.set.mockResolvedValue('OK')

      await cache.cacheSet('post:1', { id: 1 })

      expect(redisMock.set).toHaveBeenCalledWith('post:1', '{"id":1}', 'EX', 60)
    })

    it('не кидає помилку, якщо Redis впав', async () => {
      redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(cache.cacheSet('post:1', { id: 1 })).resolves.toBeUndefined()
    })
  })

  describe('cacheDel', () => {
    it('видаляє кілька ключів одним викликом', async () => {
      redisMock.del.mockResolvedValue(2)

      await cache.cacheDel('posts:list', 'post:1')

      expect(redisMock.del).toHaveBeenCalledWith('posts:list', 'post:1')
    })

    it('не смикає Redis на порожньому списку ключів', async () => {
      await cache.cacheDel()

      expect(redisMock.del).not.toHaveBeenCalled()
    })

    it('не кидає помилку, якщо Redis впав', async () => {
      redisMock.del.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(cache.cacheDel('posts:list')).resolves.toBeUndefined()
    })
  })

  describe('cacheKeys', () => {
    it('дає стабільні імена ключів', () => {
      expect(cache.cacheKeys.postsList).toBe('posts:list')
      expect(cache.cacheKeys.post(42)).toBe('post:42')
      // id з req.params приходить рядком — ключ має бути той самий
      expect(cache.cacheKeys.post('42')).toBe('post:42')
    })
  })
})

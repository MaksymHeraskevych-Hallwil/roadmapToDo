jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}))

jest.mock('../../src/lib/cache', () => ({
  __esModule: true,
  ...require('../helpers/cacheMock').cacheMock,
}))

import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from '../../src/controllers/posts.controller'
import { prismaMock, mockRequest, mockResponse } from '../helpers/prismaMock'
import { cacheMock } from '../helpers/cacheMock'

const AUTHOR = { userId: 1, email: 'author@b.com' }

describe('кешування постів', () => {
  // clearMocks обнуляє виклики, але не реалізації — повертаємо
  // стандартну поведінку явно, щоб тести не залежали від порядку
  beforeEach(() => {
    cacheMock.cacheGet.mockResolvedValue(null)
    cacheMock.cacheSet.mockResolvedValue(undefined)
    cacheMock.cacheDel.mockResolvedValue(undefined)
  })

  describe('читання', () => {
    it('на HIT віддає дані з кешу і НЕ чіпає базу', async () => {
      const cached = [{ id: 1, title: 'З кешу' }]
      cacheMock.cacheGet.mockResolvedValue(cached)

      const res = mockResponse()
      await getAllPosts(mockRequest(), res)

      expect(prismaMock.post.findMany).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(cached)
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT')
    })

    it('на MISS іде в базу і кладе результат у кеш', async () => {
      cacheMock.cacheGet.mockResolvedValue(null)
      const posts = [{ id: 1, title: 'З бази' }]
      prismaMock.post.findMany.mockResolvedValue(posts)

      const res = mockResponse()
      await getAllPosts(mockRequest(), res)

      expect(prismaMock.post.findMany).toHaveBeenCalled()
      expect(cacheMock.cacheSet).toHaveBeenCalledWith('posts:list', posts)
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS')
    })

    it('окремий пост кешується під власним ключем', async () => {
      cacheMock.cacheGet.mockResolvedValue(null)
      const post = { id: 7, title: 'Пост', comments: [] }
      prismaMock.post.findUnique.mockResolvedValue(post)

      const res = mockResponse()
      await getPost(mockRequest({ params: { id: '7' } }), res)

      expect(cacheMock.cacheGet).toHaveBeenCalledWith('post:7')
      expect(cacheMock.cacheSet).toHaveBeenCalledWith('post:7', post)
    })

    it('404 не кешується', async () => {
      cacheMock.cacheGet.mockResolvedValue(null)
      prismaMock.post.findUnique.mockResolvedValue(null)

      const res = mockResponse()
      await getPost(mockRequest({ params: { id: '999' } }), res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(cacheMock.cacheSet).not.toHaveBeenCalled()
    })

  })

  describe('інвалідація', () => {
    it('створення поста скидає кеш списку', async () => {
      prismaMock.post.create.mockResolvedValue({ id: 10 })

      const res = mockResponse()
      await createPost(
        mockRequest({ body: { title: 'T', content: 'C' }, user: AUTHOR }),
        res
      )

      expect(cacheMock.cacheDel).toHaveBeenCalledWith('posts:list')
    })

    it('оновлення скидає і список, і сам пост', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 3, authorId: AUTHOR.userId })
      prismaMock.post.update.mockResolvedValue({ id: 3 })

      const res = mockResponse()
      await updatePost(
        mockRequest({ params: { id: '3' }, body: { title: 'New' }, user: AUTHOR }),
        res
      )

      expect(cacheMock.cacheDel).toHaveBeenCalledWith('posts:list', 'post:3')
    })

    it('видалення скидає і список, і сам пост', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 4, authorId: AUTHOR.userId })
      prismaMock.post.delete.mockResolvedValue({ id: 4 })

      const res = mockResponse()
      await deletePost(mockRequest({ params: { id: '4' }, user: AUTHOR }), res)

      expect(cacheMock.cacheDel).toHaveBeenCalledWith('posts:list', 'post:4')
    })

    it('відмова в правах (403) кеш не чіпає', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 3, authorId: 999 })

      const res = mockResponse()
      await updatePost(
        mockRequest({ params: { id: '3' }, body: {}, user: AUTHOR }),
        res
      )

      expect(res.status).toHaveBeenCalledWith(403)
      expect(cacheMock.cacheDel).not.toHaveBeenCalled()
    })
  })
})

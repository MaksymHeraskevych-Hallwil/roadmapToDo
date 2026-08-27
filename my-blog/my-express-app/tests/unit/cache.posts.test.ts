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

/** Запит списку з уже провалідованими параметрами пагінації */
const listRequest = (page = 1, limit = 10) =>
  mockRequest({ validatedQuery: { page, limit } })

describe('кешування постів', () => {
  beforeEach(() => {
    cacheMock.cacheGet.mockResolvedValue(null)
    cacheMock.cacheSet.mockResolvedValue(undefined)
    cacheMock.cacheDel.mockResolvedValue(undefined)
    cacheMock.getListVersion.mockResolvedValue(1)
    cacheMock.bumpListVersion.mockResolvedValue(undefined)
    prismaMock.post.count.mockResolvedValue(0)
    prismaMock.post.findMany.mockResolvedValue([])
  })

  describe('читання списку', () => {
    it('на HIT віддає дані з кешу і НЕ чіпає базу', async () => {
      const cached = { data: [{ id: 1 }], meta: { page: 1 } }
      cacheMock.cacheGet.mockResolvedValue(cached)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(prismaMock.post.findMany).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(cached)
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT')
    })

    it('на MISS іде в базу і кладе результат у кеш', async () => {
      const posts = [{ id: 1, title: 'З бази' }]
      prismaMock.post.findMany.mockResolvedValue(posts)
      prismaMock.post.count.mockResolvedValue(1)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(cacheMock.cacheSet).toHaveBeenCalledWith(
        'posts:list:v1:p1:l10',
        expect.objectContaining({ data: posts })
      )
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS')
    })

    it('кожна сторінка має власний ключ', async () => {
      const res = mockResponse()
      await getAllPosts(listRequest(3, 20), res)

      expect(cacheMock.cacheGet).toHaveBeenCalledWith('posts:list:v1:p3:l20')
    })

    it('нова версія списку дає інший ключ — старі сторінки недосяжні', async () => {
      cacheMock.getListVersion.mockResolvedValue(7)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(cacheMock.cacheGet).toHaveBeenCalledWith('posts:list:v7:p1:l10')
    })

    it('якщо Redis недоступний, віддає дані з бази і нічого не кешує', async () => {
      cacheMock.getListVersion.mockResolvedValue(null)
      prismaMock.post.findMany.mockResolvedValue([{ id: 1 }])
      prismaMock.post.count.mockResolvedValue(1)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(cacheMock.cacheGet).not.toHaveBeenCalled()
      expect(cacheMock.cacheSet).not.toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [{ id: 1 }] })
      )
    })
  })

  describe('читання окремого поста', () => {
    it('кешується під власним ключем', async () => {
      const post = { id: 7, title: 'Пост', comments: [] }
      prismaMock.post.findUnique.mockResolvedValue(post)

      const res = mockResponse()
      await getPost(mockRequest({ params: { id: '7' } }), res)

      expect(cacheMock.cacheGet).toHaveBeenCalledWith('post:7')
      expect(cacheMock.cacheSet).toHaveBeenCalledWith('post:7', post)
    })

    it('404 не кешується', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null)

      const res = mockResponse()
      await getPost(mockRequest({ params: { id: '999' } }), res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(cacheMock.cacheSet).not.toHaveBeenCalled()
    })
  })

  describe('інвалідація', () => {
    it('створення поста піднімає версію списку', async () => {
      prismaMock.post.create.mockResolvedValue({ id: 10 })

      const res = mockResponse()
      await createPost(
        mockRequest({ body: { title: 'T', content: 'C' }, user: AUTHOR }),
        res
      )

      expect(cacheMock.bumpListVersion).toHaveBeenCalled()
    })

    it('оновлення піднімає версію і скидає кеш самого поста', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 3, authorId: AUTHOR.userId })
      prismaMock.post.update.mockResolvedValue({ id: 3 })

      const res = mockResponse()
      await updatePost(
        mockRequest({ params: { id: '3' }, body: { title: 'New' }, user: AUTHOR }),
        res
      )

      expect(cacheMock.bumpListVersion).toHaveBeenCalled()
      expect(cacheMock.cacheDel).toHaveBeenCalledWith('post:3')
    })

    it('видалення піднімає версію і скидає кеш самого поста', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 4, authorId: AUTHOR.userId })
      prismaMock.post.delete.mockResolvedValue({ id: 4 })

      const res = mockResponse()
      await deletePost(mockRequest({ params: { id: '4' }, user: AUTHOR }), res)

      expect(cacheMock.bumpListVersion).toHaveBeenCalled()
      expect(cacheMock.cacheDel).toHaveBeenCalledWith('post:4')
    })

    it('відмова в правах (403) кеш не чіпає', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 3, authorId: 999 })

      const res = mockResponse()
      await updatePost(
        mockRequest({ params: { id: '3' }, body: {}, user: AUTHOR }),
        res
      )

      expect(res.status).toHaveBeenCalledWith(403)
      expect(cacheMock.bumpListVersion).not.toHaveBeenCalled()
      expect(cacheMock.cacheDel).not.toHaveBeenCalled()
    })
  })
})

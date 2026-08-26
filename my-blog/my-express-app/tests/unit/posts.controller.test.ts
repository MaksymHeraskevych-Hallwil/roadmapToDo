jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}))

import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from '../../src/controllers/posts.controller'
import { prismaMock, mockRequest, mockResponse } from '../helpers/prismaMock'

const AUTHOR = { userId: 1, email: 'author@b.com' }

/** Запит списку з уже провалідованими параметрами пагінації */
const listRequest = (page = 1, limit = 10) =>
  mockRequest({ validatedQuery: { page, limit } })
const STRANGER = { userId: 2, email: 'stranger@b.com' }

describe('posts.controller', () => {
  describe('getAllPosts', () => {
    it('віддає пости, відсортовані від нових до старих', async () => {
      const posts = [{ id: 2 }, { id: 1 }]
      prismaMock.post.findMany.mockResolvedValue(posts)
      prismaMock.post.count.mockResolvedValue(2)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(prismaMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } })
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: posts })
      )
    })

    it('рахує skip/take за номером сторінки', async () => {
      prismaMock.post.findMany.mockResolvedValue([])
      prismaMock.post.count.mockResolvedValue(0)

      const res = mockResponse()
      await getAllPosts(listRequest(3, 10), res)

      expect(prismaMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('повертає метадані пагінації', async () => {
      prismaMock.post.findMany.mockResolvedValue([])
      prismaMock.post.count.mockResolvedValue(25)

      const res = mockResponse()
      await getAllPosts(listRequest(2, 10), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: { page: 2, limit: 10, total: 25, totalPages: 3 },
        })
      )
    })

    it('на порожній базі totalPages не менше 1', async () => {
      prismaMock.post.findMany.mockResolvedValue([])
      prismaMock.post.count.mockResolvedValue(0)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(res.json.mock.calls[0][0].meta.totalPages).toBe(1)
    })

    it('повертає 500 при помилці бази', async () => {
      prismaMock.post.findMany.mockRejectedValue(new Error('db down'))
      prismaMock.post.count.mockResolvedValue(0)

      const res = mockResponse()
      await getAllPosts(listRequest(), res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getPost', () => {
    it('шукає пост за числовим id і віддає його з коментарями', async () => {
      const post = { id: 5, title: 'Hi', comments: [] }
      prismaMock.post.findUnique.mockResolvedValue(post)

      const res = mockResponse()
      await getPost(mockRequest({ params: { id: '5' } }), res)

      expect(prismaMock.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } })
      )
      expect(res.json).toHaveBeenCalledWith(post)
    })

    it('повертає 404, якщо поста немає', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null)

      const res = mockResponse()
      await getPost(mockRequest({ params: { id: '999' } }), res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Пост не знайдено' })
    })
  })

  describe('createPost', () => {
    it('створює пост з authorId з токена, а не з тіла запиту', async () => {
      prismaMock.post.create.mockImplementation(async ({ data }: any) => ({
        id: 10,
        ...data,
      }))

      const req = mockRequest({
        body: { title: 'T', content: 'C', authorId: 999 },
        user: AUTHOR,
      })
      const res = mockResponse()

      await createPost(req, res)

      expect(prismaMock.post.create).toHaveBeenCalledWith({
        data: { title: 'T', content: 'C', authorId: AUTHOR.userId },
      })
      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updatePost', () => {
    it('оновлює пост, якщо запит від автора', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 3, authorId: AUTHOR.userId })
      prismaMock.post.update.mockResolvedValue({ id: 3, title: 'New' })

      const req = mockRequest({
        params: { id: '3' },
        body: { title: 'New', content: 'Body' },
        user: AUTHOR,
      })
      const res = mockResponse()

      await updatePost(req, res)

      expect(prismaMock.post.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { title: 'New', content: 'Body' },
      })
      expect(res.json).toHaveBeenCalledWith({ id: 3, title: 'New' })
    })

    it('повертає 403, якщо редагує не автор', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 3, authorId: AUTHOR.userId })

      const req = mockRequest({
        params: { id: '3' },
        body: { title: 'Hacked' },
        user: STRANGER,
      })
      const res = mockResponse()

      await updatePost(req, res)

      expect(prismaMock.post.update).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Тільки автор може редагувати' })
    })

    it('повертає 404 для неіснуючого поста', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null)

      const req = mockRequest({ params: { id: '77' }, body: {}, user: AUTHOR })
      const res = mockResponse()

      await updatePost(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('deletePost', () => {
    it('видаляє пост автора і віддає 204 без тіла', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 4, authorId: AUTHOR.userId })
      prismaMock.post.delete.mockResolvedValue({ id: 4 })

      const res = mockResponse()
      await deletePost(mockRequest({ params: { id: '4' }, user: AUTHOR }), res)

      expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: 4 } })
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.send).toHaveBeenCalled()
    })

    it('повертає 403, якщо видаляє не автор', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 4, authorId: AUTHOR.userId })

      const res = mockResponse()
      await deletePost(mockRequest({ params: { id: '4' }, user: STRANGER }), res)

      expect(prismaMock.post.delete).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})

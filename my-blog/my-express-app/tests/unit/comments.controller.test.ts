jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}))

import {
  createComment,
  updateComment,
  deleteComment,
} from '../../src/controllers/comments.controller'
import { prismaMock, mockRequest, mockResponse } from '../helpers/prismaMock'

const COMMENT_AUTHOR = { userId: 1, email: 'commenter@b.com' }
const POST_AUTHOR = { userId: 2, email: 'blogger@b.com' }
const STRANGER = { userId: 3, email: 'stranger@b.com' }

describe('comments.controller', () => {
  describe('createComment', () => {
    it('створює коментар з authorId з токена і числовим postId', async () => {
      prismaMock.comment.create.mockResolvedValue({ id: 1, content: 'Nice' })

      const req: any = mockRequest({
        body: { postId: '10', content: 'Nice' },
        user: COMMENT_AUTHOR,
      })
      const res = mockResponse()

      await createComment(req, res)

      expect(prismaMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { content: 'Nice', postId: 10, authorId: COMMENT_AUTHOR.userId },
        })
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('повертає 500, якщо поста з таким postId не існує', async () => {
      prismaMock.comment.create.mockRejectedValue(new Error('FK constraint failed'))

      const req: any = mockRequest({
        body: { postId: '999', content: 'Nice' },
        user: COMMENT_AUTHOR,
      })
      const res = mockResponse()

      await createComment(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Помилка при створенні коментаря',
      })
    })
  })

  describe('updateComment', () => {
    it('оновлює коментар його автором', async () => {
      prismaMock.comment.findUnique.mockResolvedValue({
        id: 5,
        authorId: COMMENT_AUTHOR.userId,
      })
      prismaMock.comment.update.mockResolvedValue({ id: 5, content: 'Edited' })

      const req: any = mockRequest({
        params: { id: '5' },
        body: { content: 'Edited' },
        user: COMMENT_AUTHOR,
      })
      const res = mockResponse()

      await updateComment(req, res)

      expect(prismaMock.comment.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { content: 'Edited' },
      })
      expect(res.json).toHaveBeenCalledWith({ id: 5, content: 'Edited' })
    })

    it('повертає 404 для неіснуючого коментаря', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(null)

      const req: any = mockRequest({
        params: { id: '404' },
        body: { content: 'x' },
        user: COMMENT_AUTHOR,
      })
      const res = mockResponse()

      await updateComment(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Коментар не знайдено' })
    })

    it('автор поста НЕ може редагувати чужий коментар — 403', async () => {
      prismaMock.comment.findUnique.mockResolvedValue({
        id: 5,
        authorId: COMMENT_AUTHOR.userId,
      })

      const req: any = mockRequest({
        params: { id: '5' },
        body: { content: 'Hacked' },
        user: POST_AUTHOR,
      })
      const res = mockResponse()

      await updateComment(req, res)

      expect(prismaMock.comment.update).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('deleteComment', () => {
    const comment = {
      id: 7,
      authorId: COMMENT_AUTHOR.userId,
      post: { id: 10, authorId: POST_AUTHOR.userId },
    }

    it('автор коментаря може його видалити', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(comment)
      prismaMock.comment.delete.mockResolvedValue(comment)

      const req: any = mockRequest({ params: { id: '7' }, user: COMMENT_AUTHOR })
      const res = mockResponse()

      await deleteComment(req, res)

      expect(prismaMock.comment.delete).toHaveBeenCalledWith({ where: { id: 7 } })
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('автор поста може видалити коментар у себе під постом (модерація)', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(comment)
      prismaMock.comment.delete.mockResolvedValue(comment)

      const req: any = mockRequest({ params: { id: '7' }, user: POST_AUTHOR })
      const res = mockResponse()

      await deleteComment(req, res)

      expect(prismaMock.comment.delete).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('стороннього користувача не пускає — 403', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(comment)

      const req: any = mockRequest({ params: { id: '7' }, user: STRANGER })
      const res = mockResponse()

      await deleteComment(req, res)

      expect(prismaMock.comment.delete).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Немає прав на видалення' })
    })

    it('повертає 404 для неіснуючого коментаря', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(null)

      const req: any = mockRequest({ params: { id: '123' }, user: COMMENT_AUTHOR })
      const res = mockResponse()

      await deleteComment(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})

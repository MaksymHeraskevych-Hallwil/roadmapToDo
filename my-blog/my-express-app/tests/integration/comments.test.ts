import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'
import { createUser, createPost, TestUser } from './helpers'

describe('CRUD /api/comments (інтеграція)', () => {
  let postAuthor: TestUser
  let commenter: TestUser
  let stranger: TestUser
  let post: any

  beforeEach(async () => {
    postAuthor = await createUser('PostAuthor')
    commenter = await createUser('Commenter')
    stranger = await createUser('Stranger')
    post = await createPost(postAuthor)
  })

  describe('створення', () => {
    it('створює коментар і повертає його з автором', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', commenter.auth)
        .send({ postId: post.id, content: 'Дякую за пост' })
        .expect(201)

      expect(res.body).toMatchObject({
        content: 'Дякую за пост',
        postId: post.id,
        authorId: commenter.id,
      })
      expect(res.body.author).toMatchObject({ id: commenter.id, name: 'Commenter' })

      expect(await prisma.comment.count()).toBe(1)
    })

    it('без токена — 401', async () => {
      await request(app)
        .post('/api/comments')
        .send({ postId: post.id, content: 'Анонімний' })
        .expect(401)

      expect(await prisma.comment.count()).toBe(0)
    })

    it('до неіснуючого поста коментар не створюється', async () => {
      await request(app)
        .post('/api/comments')
        .set('Authorization', commenter.auth)
        .send({ postId: 999999, content: 'У порожнечу' })
        .expect(500)

      expect(await prisma.comment.count()).toBe(0)
    })
  })

  describe('оновлення', () => {
    let comment: any

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', commenter.auth)
        .send({ postId: post.id, content: 'Оригінальний текст' })
        .expect(201)
      comment = res.body
    })

    it('автор коментаря може його відредагувати', async () => {
      const res = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', commenter.auth)
        .send({ content: 'Відредаговано' })
        .expect(200)

      expect(res.body.content).toBe('Відредаговано')

      const inDb = await prisma.comment.findUnique({ where: { id: comment.id } })
      expect(inDb!.content).toBe('Відредаговано')
    })

    it('навіть автор поста не може редагувати чужий коментар — 403', async () => {
      await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', postAuthor.auth)
        .send({ content: 'Підміна' })
        .expect(403)

      const inDb = await prisma.comment.findUnique({ where: { id: comment.id } })
      expect(inDb!.content).toBe('Оригінальний текст')
    })

    it('404 для неіснуючого коментаря', async () => {
      await request(app)
        .put('/api/comments/999999')
        .set('Authorization', commenter.auth)
        .send({ content: 'X' })
        .expect(404)
    })
  })

  describe('видалення', () => {
    let comment: any

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', commenter.auth)
        .send({ postId: post.id, content: 'Коментар' })
        .expect(201)
      comment = res.body
    })

    it('автор коментаря може його видалити', async () => {
      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', commenter.auth)
        .expect(204)

      expect(await prisma.comment.count()).toBe(0)
    })

    it('автор поста може видалити коментар під своїм постом', async () => {
      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', postAuthor.auth)
        .expect(204)

      expect(await prisma.comment.count()).toBe(0)
    })

    it('стороннього користувача не пускає — 403', async () => {
      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', stranger.auth)
        .expect(403)

      expect(await prisma.comment.count()).toBe(1)
    })
  })
})

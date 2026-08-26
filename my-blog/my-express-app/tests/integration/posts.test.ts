import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'
import { createUser, createPost, TestUser } from './helpers'

describe('CRUD /api/posts (інтеграція)', () => {
  let author: TestUser
  let stranger: TestUser

  beforeEach(async () => {
    author = await createUser('Author')
    stranger = await createUser('Stranger')
  })

  describe('створення', () => {
    it('створює пост і кладе його в базу', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', author.auth)
        .send({ title: 'Мій перший пост', content: 'Текст поста' })
        .expect(201)

      expect(res.body).toMatchObject({
        title: 'Мій перший пост',
        content: 'Текст поста',
        authorId: author.id,
      })

      const inDb = await prisma.post.findUnique({ where: { id: res.body.id } })
      expect(inDb!.title).toBe('Мій перший пост')
    })

    it('без токена — 401', async () => {
      await request(app)
        .post('/api/posts')
        .send({ title: 'T', content: 'C' })
        .expect(401)

      expect(await prisma.post.count()).toBe(0)
    })

    it('з підробленим токеном — 401', async () => {
      await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer fake.token.here')
        .send({ title: 'T', content: 'C' })
        .expect(401)
    })
  })

  describe('читання', () => {
    it('віддає список постів разом з автором, без токена', async () => {
      await createPost(author, 'Перший')
      await createPost(author, 'Другий')

      const res = await request(app).get('/api/posts').expect(200)

      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0].author).toMatchObject({ id: author.id, name: 'Author' })
      // Новіші пости — першими
      expect(res.body.data[0].title).toBe('Другий')
      expect(res.body.meta).toMatchObject({ page: 1, limit: 10, total: 2 })
    })

    it('віддає окремий пост з коментарями', async () => {
      const post = await createPost(author)
      await request(app)
        .post('/api/comments')
        .set('Authorization', stranger.auth)
        .send({ postId: post.id, content: 'Класний пост' })
        .expect(201)

      const res = await request(app).get(`/api/posts/${post.id}`).expect(200)

      expect(res.body.comments).toHaveLength(1)
      expect(res.body.comments[0].content).toBe('Класний пост')
      expect(res.body.comments[0].author.name).toBe('Stranger')
    })

    it('404 для неіснуючого поста', async () => {
      await request(app).get('/api/posts/999999').expect(404)
    })
  })

  describe('оновлення', () => {
    it('автор може оновити свій пост', async () => {
      const post = await createPost(author)

      const res = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', author.auth)
        .send({ title: 'Оновлений', content: 'Новий текст' })
        .expect(200)

      expect(res.body.title).toBe('Оновлений')

      const inDb = await prisma.post.findUnique({ where: { id: post.id } })
      expect(inDb!.content).toBe('Новий текст')
    })

    it('чужий користувач отримує 403, і пост не змінюється', async () => {
      const post = await createPost(author, 'Оригінал')

      await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', stranger.auth)
        .send({ title: 'Зламано', content: 'Зламано' })
        .expect(403)

      const inDb = await prisma.post.findUnique({ where: { id: post.id } })
      expect(inDb!.title).toBe('Оригінал')
    })

    it('без токена — 401', async () => {
      const post = await createPost(author)
      await request(app).put(`/api/posts/${post.id}`).send({ title: 'X' }).expect(401)
    })
  })

  describe('видалення', () => {
    it('автор видаляє свій пост — 204, у базі порожньо', async () => {
      const post = await createPost(author)

      await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', author.auth)
        .expect(204)

      expect(await prisma.post.count()).toBe(0)
    })

    it('чужий користувач отримує 403, пост лишається', async () => {
      const post = await createPost(author)

      await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', stranger.auth)
        .expect(403)

      expect(await prisma.post.count()).toBe(1)
    })

    it('видалення поста каскадно прибирає його коментарі', async () => {
      const post = await createPost(author)
      await request(app)
        .post('/api/comments')
        .set('Authorization', stranger.auth)
        .send({ postId: post.id, content: 'Коментар' })
        .expect(201)

      await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', author.auth)
        .expect(204)

      expect(await prisma.comment.count()).toBe(0)
    })

    it('404 для неіснуючого поста', async () => {
      await request(app)
        .delete('/api/posts/999999')
        .set('Authorization', author.auth)
        .expect(404)
    })
  })
})

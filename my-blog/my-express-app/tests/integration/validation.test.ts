import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'
import { createUser, createPost, TestUser } from './helpers'

describe('валідація вхідних даних (інтеграція)', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createUser('User')
  })

  describe('реєстрація', () => {
    it('не приймає короткий пароль', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'short@test.com', password: '123' })
        .expect(400)

      expect(res.body.error).toBe('Некоректні дані')
      expect(res.body.details[0].field).toBe('password')
      expect(await prisma.user.count()).toBe(1) // тільки той, що з beforeEach
    })

    it('не приймає email без @', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400)

      expect(res.body.details[0].field).toBe('email')
    })

    it('не приймає порожнє тіло і показує обидва поля', async () => {
      const res = await request(app).post('/api/auth/register').send({}).expect(400)

      const fields = res.body.details.map((d: any) => d.field)
      expect(fields).toEqual(expect.arrayContaining(['email', 'password']))
    })

    it('email зберігається в нижньому регістрі', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: '  MiXeD@Case.COM ', password: 'password123' })
        .expect(201)

      expect(
        await prisma.user.findUnique({ where: { email: 'mixed@case.com' } })
      ).not.toBeNull()
    })
  })

  describe('пости', () => {
    it('не створює пост із порожнім заголовком', async () => {
      await request(app)
        .post('/api/posts')
        .set('Authorization', user.auth)
        .send({ title: '   ', content: 'Текст' })
        .expect(400)

      expect(await prisma.post.count()).toBe(0)
    })

    it('не створює пост без content', async () => {
      await request(app)
        .post('/api/posts')
        .set('Authorization', user.auth)
        .send({ title: 'Заголовок' })
        .expect(400)
    })

    it('401 має пріоритет над 400: спершу «хто ти», потім «що прислав»', async () => {
      // Тіло свідомо некоректне, але токена немає — очікуємо саме 401
      await request(app).post('/api/posts').send({ title: '' }).expect(401)
    })

    it('authorId з тіла запиту ігнорується', async () => {
      const other = await createUser('Other')

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', user.auth)
        .send({ title: 'T', content: 'C', authorId: other.id })
        .expect(201)

      expect(res.body.authorId).toBe(user.id)
    })

    it('нечисловий id у шляху дає 400, а не 500', async () => {
      await request(app).get('/api/posts/abc').expect(400)
    })

    it('порожнє тіло при оновленні відхиляється', async () => {
      const post = await createPost(user)

      await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', user.auth)
        .send({})
        .expect(400)
    })
  })

  describe('коментарі', () => {
    it('не створює порожній коментар', async () => {
      const post = await createPost(user)

      await request(app)
        .post('/api/comments')
        .set('Authorization', user.auth)
        .send({ postId: post.id, content: '' })
        .expect(400)

      expect(await prisma.comment.count()).toBe(0)
    })

    it('postId рядком приводиться до числа', async () => {
      const post = await createPost(user)

      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', user.auth)
        .send({ postId: String(post.id), content: 'Коментар' })
        .expect(201)

      expect(res.body.postId).toBe(post.id)
    })
  })
})

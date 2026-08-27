import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'
import { createUser, TestUser } from './helpers'

describe('пагінація списку постів (інтеграція)', () => {
  let author: TestUser

  beforeEach(async () => {
    author = await createUser('Author')

    // 25 постів одним запитом — createMany швидший за 25 HTTP-викликів
    await prisma.post.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        title: `Пост ${i + 1}`,
        content: 'Текст',
        authorId: author.id,
      })),
    })
  })

  it('за замовчуванням віддає 10 постів і коректні метадані', async () => {
    const res = await request(app).get('/api/posts').expect(200)

    expect(res.body.data).toHaveLength(10)
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    })
  })

  it('друга сторінка не перетинається з першою', async () => {
    const first = await request(app).get('/api/posts?page=1').expect(200)
    const second = await request(app).get('/api/posts?page=2').expect(200)

    const ids = (r: any) => r.body.data.map((p: any) => p.id)
    expect(ids(first)).not.toEqual(ids(second))
    expect(ids(first).filter((id: number) => ids(second).includes(id))).toHaveLength(0)
  })

  it('остання сторінка містить залишок', async () => {
    const res = await request(app).get('/api/posts?page=3').expect(200)

    expect(res.body.data).toHaveLength(5)
  })

  it('сторінка за межами діапазону віддає порожній список, а не помилку', async () => {
    const res = await request(app).get('/api/posts?page=99').expect(200)

    expect(res.body.data).toHaveLength(0)
    expect(res.body.meta.total).toBe(25)
  })

  it('limit працює', async () => {
    const res = await request(app).get('/api/posts?limit=5').expect(200)

    expect(res.body.data).toHaveLength(5)
    expect(res.body.meta.totalPages).toBe(5)
  })

  it('limit понад 50 відхиляється — обійти пагінацію не можна', async () => {
    await request(app).get('/api/posts?limit=100000').expect(400)
  })

  it('page=0 і від’ємні значення відхиляються', async () => {
    await request(app).get('/api/posts?page=0').expect(400)
    await request(app).get('/api/posts?page=-1').expect(400)
  })

  it('нечислові параметри відхиляються', async () => {
    await request(app).get('/api/posts?page=abc').expect(400)
  })

  describe('взаємодія з кешем', () => {
    it('сторінки кешуються незалежно одна від одної', async () => {
      await request(app).get('/api/posts?page=1').expect(200)

      // друга сторінка ще не прогріта
      const second = await request(app).get('/api/posts?page=2').expect(200)
      expect(second.headers['x-cache']).toBe('MISS')

      const secondAgain = await request(app).get('/api/posts?page=2').expect(200)
      expect(secondAgain.headers['x-cache']).toBe('HIT')
    })

    it('новий пост скидає кеш УСІХ сторінок, не лише першої', async () => {
      await request(app).get('/api/posts?page=1').expect(200)
      await request(app).get('/api/posts?page=2').expect(200)

      await request(app)
        .post('/api/posts')
        .set('Authorization', author.auth)
        .send({ title: 'Свіжий', content: 'Текст' })
        .expect(201)

      // саме тут ламалася б інвалідація одного ключа:
      // друга сторінка лишалась би застарілою
      const second = await request(app).get('/api/posts?page=2').expect(200)
      expect(second.headers['x-cache']).toBe('MISS')
      expect(second.body.meta.total).toBe(26)
    })
  })
})

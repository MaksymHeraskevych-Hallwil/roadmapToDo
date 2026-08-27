import request from 'supertest'
import app from '../../src/app'
import { redis, cacheKeys, getListVersion } from '../../src/lib/cache'
import { createUser, createPost, TestUser } from './helpers'

/**
 * Тут перевіряється зв'язка Express ↔ Redis по-справжньому:
 * контейнер redis-test з docker-compose.test.yml, ніяких моків.
 */
describe('кешування через Redis (інтеграція)', () => {
  let author: TestUser

  beforeEach(async () => {
    author = await createUser('Author')
  })

  it('Redis доступний і healthcheck це показує', async () => {
    const res = await request(app).get('/api/health').expect(200)
    expect(res.body).toEqual({ status: 'ok', cache: 'up' })
  })

  describe('список постів', () => {
    it('перший запит — MISS, другий — HIT', async () => {
      await createPost(author, 'Пост')

      const first = await request(app).get('/api/posts').expect(200)
      expect(first.headers['x-cache']).toBe('MISS')

      const second = await request(app).get('/api/posts').expect(200)
      expect(second.headers['x-cache']).toBe('HIT')
      expect(second.body).toEqual(first.body)
    })

    it('після MISS ключ реально лежить у Redis із TTL', async () => {
      await createPost(author)
      await request(app).get('/api/posts').expect(200)

      const version = await getListVersion()
      const key = cacheKeys.postsList(version!, 1, 10)

      expect(await redis!.get(key)).not.toBeNull()

      const ttl = await redis!.ttl(key)
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(60)
    })

    it('новий пост скидає кеш списку — старих даних не віддається', async () => {
      await createPost(author, 'Перший')
      await request(app).get('/api/posts').expect(200) // прогріли кеш

      await createPost(author, 'Другий')

      const res = await request(app).get('/api/posts').expect(200)
      expect(res.headers['x-cache']).toBe('MISS')
      expect(res.body.data).toHaveLength(2)
    })

    it('оновлення поста скидає кеш списку', async () => {
      const post = await createPost(author, 'Оригінал')
      await request(app).get('/api/posts').expect(200)

      await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', author.auth)
        .send({ title: 'Оновлений', content: 'Текст' })
        .expect(200)

      const res = await request(app).get('/api/posts').expect(200)
      expect(res.body.data[0].title).toBe('Оновлений')
    })

    it('видалення поста скидає кеш списку', async () => {
      const post = await createPost(author)
      await request(app).get('/api/posts').expect(200)

      await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', author.auth)
        .expect(204)

      const res = await request(app).get('/api/posts').expect(200)
      expect(res.body.data).toHaveLength(0)
    })

    it('невдала спроба редагувати чужий пост кеш не скидає', async () => {
      const post = await createPost(author, 'Оригінал')
      await request(app).get('/api/posts').expect(200)

      const stranger = await createUser('Stranger')
      await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', stranger.auth)
        .send({ title: 'Зламано' })
        .expect(403)

      const res = await request(app).get('/api/posts').expect(200)
      expect(res.headers['x-cache']).toBe('HIT')
    })
  })

  describe('окремий пост', () => {
    it('кешується під власним ключем', async () => {
      const post = await createPost(author)

      const first = await request(app).get(`/api/posts/${post.id}`).expect(200)
      expect(first.headers['x-cache']).toBe('MISS')

      const second = await request(app).get(`/api/posts/${post.id}`).expect(200)
      expect(second.headers['x-cache']).toBe('HIT')

      expect(await redis!.get(cacheKeys.post(post.id))).not.toBeNull()
    })

    it('404 не кешується', async () => {
      await request(app).get('/api/posts/999999').expect(404)

      expect(await redis!.get(cacheKeys.post(999999))).toBeNull()
    })

    it('новий коментар скидає кеш свого поста', async () => {
      const post = await createPost(author)
      await request(app).get(`/api/posts/${post.id}`).expect(200) // прогріли

      await request(app)
        .post('/api/comments')
        .set('Authorization', author.auth)
        .send({ postId: post.id, content: 'Коментар' })
        .expect(201)

      const res = await request(app).get(`/api/posts/${post.id}`).expect(200)
      expect(res.headers['x-cache']).toBe('MISS')
      expect(res.body.comments).toHaveLength(1)
    })

    it('видалення коментаря теж скидає кеш поста', async () => {
      const post = await createPost(author)
      const comment = await request(app)
        .post('/api/comments')
        .set('Authorization', author.auth)
        .send({ postId: post.id, content: 'Коментар' })
        .expect(201)

      await request(app).get(`/api/posts/${post.id}`).expect(200)

      await request(app)
        .delete(`/api/comments/${comment.body.id}`)
        .set('Authorization', author.auth)
        .expect(204)

      const res = await request(app).get(`/api/posts/${post.id}`).expect(200)
      expect(res.body.comments).toHaveLength(0)
    })

    it('кеш поста і кеш списку незалежні', async () => {
      const post = await createPost(author)
      await request(app).get('/api/posts').expect(200)
      await request(app).get(`/api/posts/${post.id}`).expect(200)

      // коментар змінює тільки сторінку поста, не список
      await request(app)
        .post('/api/comments')
        .set('Authorization', author.auth)
        .send({ postId: post.id, content: 'Коментар' })
        .expect(201)

      const list = await request(app).get('/api/posts').expect(200)
      expect(list.headers['x-cache']).toBe('HIT')

      const single = await request(app).get(`/api/posts/${post.id}`).expect(200)
      expect(single.headers['x-cache']).toBe('MISS')
    })
  })
})

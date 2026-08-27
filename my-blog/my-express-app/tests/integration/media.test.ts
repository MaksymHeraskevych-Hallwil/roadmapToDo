import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'
import { createUser, TestUser } from './helpers'

/**
 * Справжнє завантаження у справжнє S3-сумісне сховище (MinIO
 * з docker-compose.test.yml). Ті самі виклики підуть у Cloudflare R2 —
 * різниця лише в змінних середовища.
 */

// Найменший валідний PNG (1×1 піксель)
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

describe('завантаження зображень (інтеграція з MinIO)', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createUser('Uploader')
  })

  describe('POST /api/media', () => {
    it('завантажує PNG і повертає метадані з URL', async () => {
      const res = await request(app)
        .post('/api/media')
        .set('Authorization', user.auth)
        .attach('file', PNG_1x1, 'picture.png')
        .expect(201)

      expect(res.body).toMatchObject({
        mimeType: 'image/png',
        authorId: user.id,
      })
      expect(res.body.url).toContain('blog-media-test')
      // Ім'я від користувача не використовуємо — ключ генерується
      expect(res.body.key).not.toContain('picture')
      expect(res.body.key).toMatch(/^images\/\d{4}\/\d{2}\/.+\.png$/)

      expect(await prisma.media.count()).toBe(1)
    })

    it('файл реально лежить у сховищі й доступний за URL', async () => {
      const res = await request(app)
        .post('/api/media')
        .set('Authorization', user.auth)
        .attach('file', PNG_1x1, 'picture.png')
        .expect(201)

      // Тягнемо картинку так само, як це зробив би браузер
      const download = await fetch(res.body.url)

      expect(download.status).toBe(200)
      expect(download.headers.get('content-type')).toBe('image/png')

      const bytes = Buffer.from(await download.arrayBuffer())
      expect(bytes.equals(PNG_1x1)).toBe(true)
    })

    it('без токена — 401', async () => {
      await request(app).post('/api/media').attach('file', PNG_1x1, 'a.png').expect(401)

      expect(await prisma.media.count()).toBe(0)
    })

    it('без файлу — 400', async () => {
      await request(app)
        .post('/api/media')
        .set('Authorization', user.auth)
        .expect(400)
    })

    it('не приймає не-зображення, навіть із підробленим Content-Type', async () => {
      const fake = Buffer.from('#!/bin/sh\nrm -rf /\n')

      const res = await request(app)
        .post('/api/media')
        .set('Authorization', user.auth)
        // клієнт СТВЕРДЖУЄ, що це png — сервер перевіряє вміст
        .attach('file', fake, { filename: 'evil.png', contentType: 'image/png' })
        .expect(400)

      expect(res.body.error).toContain('Дозволені лише зображення')
      expect(await prisma.media.count()).toBe(0)
    })
  })

  describe('DELETE /api/media/:id', () => {
    it('автор видаляє свій файл — і зі сховища теж', async () => {
      const upload = await request(app)
        .post('/api/media')
        .set('Authorization', user.auth)
        .attach('file', PNG_1x1, 'a.png')
        .expect(201)

      await request(app)
        .delete(`/api/media/${upload.body.id}`)
        .set('Authorization', user.auth)
        .expect(204)

      expect(await prisma.media.count()).toBe(0)

      const download = await fetch(upload.body.url)
      expect(download.status).toBe(404)
    })

    it('чужий файл видалити не можна — 403', async () => {
      const upload = await request(app)
        .post('/api/media')
        .set('Authorization', user.auth)
        .attach('file', PNG_1x1, 'a.png')
        .expect(201)

      const stranger = await createUser('Stranger')

      await request(app)
        .delete(`/api/media/${upload.body.id}`)
        .set('Authorization', stranger.auth)
        .expect(403)

      expect(await prisma.media.count()).toBe(1)
    })
  })

  describe('обкладинка поста', () => {
    const uploadImage = async (as: TestUser) =>
      (
        await request(app)
          .post('/api/media')
          .set('Authorization', as.auth)
          .attach('file', PNG_1x1, 'cover.png')
          .expect(201)
      ).body

    it('пост створюється з обкладинкою і віддає її в списку', async () => {
      const image = await uploadImage(user)

      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', user.auth)
        .send({ title: 'З картинкою', content: 'Текст', imageId: image.id })
        .expect(201)

      expect(created.body.image).toMatchObject({ id: image.id, url: image.url })

      const list = await request(app).get('/api/posts').expect(200)
      expect(list.body.data[0].image.url).toBe(image.url)
    })

    it('чужу картинку до свого поста причепити не можна — 403', async () => {
      const image = await uploadImage(user)
      const stranger = await createUser('Stranger')

      await request(app)
        .post('/api/posts')
        .set('Authorization', stranger.auth)
        .send({ title: 'Крадена', content: 'Текст', imageId: image.id })
        .expect(403)

      expect(await prisma.post.count()).toBe(0)
    })

    it('обкладинку можна прибрати, надіславши imageId: null', async () => {
      const image = await uploadImage(user)

      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', user.auth)
        .send({ title: 'З картинкою', content: 'Текст', imageId: image.id })
        .expect(201)

      const updated = await request(app)
        .put(`/api/posts/${created.body.id}`)
        .set('Authorization', user.auth)
        .send({ title: 'Без картинки', content: 'Текст', imageId: null })
        .expect(200)

      expect(updated.body.image).toBeNull()
    })

    it('видалення картинки не видаляє пост — обкладинка просто зникає', async () => {
      const image = await uploadImage(user)

      const created = await request(app)
        .post('/api/posts')
        .set('Authorization', user.auth)
        .send({ title: 'Пост', content: 'Текст', imageId: image.id })
        .expect(201)

      await request(app)
        .delete(`/api/media/${image.id}`)
        .set('Authorization', user.auth)
        .expect(204)

      const post = await request(app).get(`/api/posts/${created.body.id}`).expect(200)
      expect(post.body.image).toBeNull()
      expect(await prisma.post.count()).toBe(1)
    })
  })
})

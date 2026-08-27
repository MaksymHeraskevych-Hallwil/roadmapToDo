import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'

describe('POST /api/auth (інтеграція з реальною базою)', () => {
  const credentials = { email: 'integration@test.com', password: 'password123', name: 'Max' }

  it('реєструє користувача і зберігає його в базі з хешем пароля', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(credentials)
      .expect(201)

    expect(res.body.user).toMatchObject({ email: credentials.email, name: 'Max' })
    expect(res.body.user.password).toBeUndefined()

    const inDb = await prisma.user.findUnique({ where: { email: credentials.email } })
    expect(inDb).not.toBeNull()
    expect(inDb!.password).not.toBe(credentials.password)
    expect(inDb!.password.startsWith('$2')).toBe(true)
  })

  it('не дає зареєструвати той самий email двічі', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(201)

    const res = await request(app)
      .post('/api/auth/register')
      .send(credentials)
      .expect(400)

    expect(res.body.error).toBe('Email вже зареєстрований')
    expect(await prisma.user.count()).toBe(1)
  })

  it('логінить користувача і видає валідний JWT', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(201)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200)

    const decoded: any = jwt.verify(res.body.token, process.env.JWT_SECRET!)
    expect(decoded.email).toBe(credentials.email)
    expect(decoded.userId).toBe(res.body.user.id)
  })

  it('не логінить з невірним паролем', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(201)

    await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong' })
      .expect(401)
  })

  it('не логінить неіснуючого користувача', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' })
      .expect(401)
  })
})

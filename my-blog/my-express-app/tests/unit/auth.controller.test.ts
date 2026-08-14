jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}))

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { register, login } from '../../src/controllers/auth.controller'
import { prismaMock, mockRequest, mockResponse } from '../helpers/prismaMock'

describe('auth.controller', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('register', () => {
    it('створює користувача з захешованим паролем і повертає 201', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)
      prismaMock.user.create.mockImplementation(async ({ data }: any) => ({
        id: 1,
        ...data,
      }))

      const req = mockRequest({
        body: { email: 'new@user.com', password: 'secret123', name: 'Max' },
      })
      const res = mockResponse()

      await register(req, res)

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@user.com' },
      })

      const created = prismaMock.user.create.mock.calls[0][0].data
      expect(created.password).not.toBe('secret123')
      await expect(bcrypt.compare('secret123', created.password)).resolves.toBe(true)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Користувач створений',
        user: { id: 1, email: 'new@user.com', name: 'Max' },
      })
    })

    it('не віддає хеш пароля в відповіді', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)
      prismaMock.user.create.mockResolvedValue({
        id: 2,
        email: 'a@b.com',
        name: null,
        password: 'hashed',
      })

      const req = mockRequest({ body: { email: 'a@b.com', password: 'pwd' } })
      const res = mockResponse()

      await register(req, res)

      expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('hashed')
    })

    it('повертає 400, якщо email вже зайнятий', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'taken@b.com' })

      const req = mockRequest({ body: { email: 'taken@b.com', password: 'pwd' } })
      const res = mockResponse()

      await register(req, res)

      expect(prismaMock.user.create).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Email вже зареєстрований' })
    })

    it('повертає 500, якщо база впала', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db is down'))

      const req = mockRequest({ body: { email: 'a@b.com', password: 'pwd' } })
      const res = mockResponse()

      await register(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Помилка сервера' })
    })
  })

  describe('login', () => {
    const makeUser = async () => ({
      id: 42,
      email: 'user@b.com',
      name: 'User',
      password: await bcrypt.hash('correct-password', 10),
    })

    it('повертає токен з коректним payload', async () => {
      prismaMock.user.findUnique.mockResolvedValue(await makeUser())

      const req = mockRequest({
        body: { email: 'user@b.com', password: 'correct-password' },
      })
      const res = mockResponse()

      await login(req, res)

      const payload = res.json.mock.calls[0][0]
      expect(payload.user).toEqual({ id: 42, email: 'user@b.com', name: 'User' })

      const decoded: any = jwt.verify(payload.token, 'test-secret')
      expect(decoded.userId).toBe(42)
      expect(decoded.email).toBe('user@b.com')
      expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60)
    })

    it('повертає 401, якщо користувача немає', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      const req = mockRequest({ body: { email: 'ghost@b.com', password: 'pwd' } })
      const res = mockResponse()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Неправильний email або пароль',
      })
    })

    it('повертає 401 на невірний пароль', async () => {
      prismaMock.user.findUnique.mockResolvedValue(await makeUser())

      const req = mockRequest({
        body: { email: 'user@b.com', password: 'wrong-password' },
      })
      const res = mockResponse()

      await login(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      // Повідомлення однакове для «немає юзера» і «невірний пароль» —
      // щоб не давати підказку, які email зареєстровані.
      expect(res.json).toHaveBeenCalledWith({
        error: 'Неправильний email або пароль',
      })
    })
  })
})

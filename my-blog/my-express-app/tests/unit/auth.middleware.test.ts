import jwt from 'jsonwebtoken'
import authMiddleware from '../../src/middlewares/auth.middleware'
import { mockRequest, mockResponse } from '../helpers/prismaMock'

const SECRET = 'test-secret'

describe('authMiddleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRET
  })

  it('повертає 401, якщо заголовка Authorization немає', () => {
    const req = mockRequest()
    const res = mockResponse()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Потрібен токен автентифікації' })
    expect(next).not.toHaveBeenCalled()
  })

  it('повертає 401, якщо схема не Bearer', () => {
    const req = mockRequest({ headers: { authorization: 'Basic abc123' } })
    const res = mockResponse()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('повертає 401 на невалідний токен', () => {
    const req = mockRequest({ headers: { authorization: 'Bearer not-a-token' } })
    const res = mockResponse()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Невірний токен' })
    expect(next).not.toHaveBeenCalled()
  })

  it('повертає 401 на токен, підписаний іншим ключем', () => {
    const foreignToken = jwt.sign({ userId: 1 }, 'another-secret')
    const req = mockRequest({ headers: { authorization: `Bearer ${foreignToken}` } })
    const res = mockResponse()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('повертає 401 на протермінований токен', () => {
    const expired = jwt.sign({ userId: 1 }, SECRET, { expiresIn: '-1h' })
    const req = mockRequest({ headers: { authorization: `Bearer ${expired}` } })
    const res = mockResponse()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('кладе користувача в req.user і кличе next() на валідному токені', () => {
    const token = jwt.sign({ userId: 7, email: 'a@b.com' }, SECRET)
    const req: any = mockRequest({ headers: { authorization: `Bearer ${token}` } })
    const res = mockResponse()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(req.user).toMatchObject({ userId: 7, email: 'a@b.com' })
  })
})

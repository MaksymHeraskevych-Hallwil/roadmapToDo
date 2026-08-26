import { z } from 'zod'
import validate from '../../src/middlewares/validate.middleware'
import { mockRequest, mockResponse } from '../helpers/prismaMock'
import {
  registerSchema,
  createPostSchema,
  paginationSchema,
} from '../../src/schemas'

describe('validate middleware', () => {
  it('пропускає коректні дані далі', () => {
    const req: any = mockRequest({ body: { title: 'Заголовок', content: 'Текст' } })
    const res = mockResponse()
    const next = jest.fn()

    validate(createPostSchema)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('обрізає пробіли навколо значень', () => {
    const req: any = mockRequest({ body: { title: '  Заголовок  ', content: 'Текст' } })
    const res = mockResponse()

    validate(createPostSchema)(req, res, jest.fn())

    expect(req.body.title).toBe('Заголовок')
  })

  it('повертає 400 зі списком полів і не кличе next', () => {
    const req: any = mockRequest({ body: { title: '', content: '' } })
    const res = mockResponse()
    const next = jest.fn()

    validate(createPostSchema)(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)

    const payload = res.json.mock.calls[0][0]
    expect(payload.error).toBe('Некоректні дані')
    expect(payload.details.map((d: any) => d.field)).toEqual(
      expect.arrayContaining(['title', 'content'])
    )
  })

  it('приводить типи: рядки з query стають числами', () => {
    const req: any = mockRequest({ query: { page: '3', limit: '25' } })
    const res = mockResponse()

    validate(paginationSchema, 'query')(req, res, jest.fn())

    expect(req.validatedQuery).toEqual({ page: 3, limit: 25 })
  })

  it('підставляє значення за замовчуванням, якщо параметрів немає', () => {
    const req: any = mockRequest({ query: {} })
    const res = mockResponse()

    validate(paginationSchema, 'query')(req, res, jest.fn())

    expect(req.validatedQuery).toEqual({ page: 1, limit: 10 })
  })

  it('не дає обійти пагінацію через величезний limit', () => {
    const req: any = mockRequest({ query: { limit: '1000000' } })
    const res = mockResponse()
    const next = jest.fn()

    validate(paginationSchema, 'query')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('не чіпає req.query — в Express 5 він лише для читання', () => {
    const original = { page: '2' }
    const req: any = mockRequest({ query: original })
    const res = mockResponse()

    validate(paginationSchema, 'query')(req, res, jest.fn())

    expect(req.query).toBe(original)
  })
})

describe('схеми', () => {
  it('короткий пароль не проходить', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'short',
    })

    expect(result.success).toBe(false)
  })

  it('email нормалізується до нижнього регістру', () => {
    const result = registerSchema.parse({
      email: '  MAX@Example.COM ',
      password: 'password123',
    })

    expect(result.email).toBe('max@example.com')
  })

  it('заголовок з самих пробілів вважається порожнім', () => {
    const result = createPostSchema.safeParse({ title: '   ', content: 'Текст' })

    expect(result.success).toBe(false)
  })

  it('невідомі поля просто відкидаються', () => {
    const result: any = createPostSchema.parse({
      title: 'T',
      content: 'C',
      authorId: 999,
    })

    // authorId має братись із токена, а не з тіла запиту
    expect(result.authorId).toBeUndefined()
  })
})

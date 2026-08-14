/**
 * Спільні хелпери для юніт-тестів:
 * фабрика мока Prisma + фейкові req/res об'єкти Express.
 */

export const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  post: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

/** Фейковий Response з чейнінгом status().json() */
export const mockResponse = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  // контролери ставлять заголовок X-Cache
  res.set = jest.fn().mockReturnValue(res)
  return res
}

/** Фейковий Request */
export const mockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  headers: {},
  ...overrides,
})

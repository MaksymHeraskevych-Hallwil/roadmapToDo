/** Фейковий клієнт ioredis для юніт-тестів кеш-шару. */
export const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
}

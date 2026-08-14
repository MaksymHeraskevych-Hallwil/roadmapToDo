/**
 * Мок кеш-шару для юніт-тестів.
 * Ключі рахуємо так само, як у справжньому cacheKeys, — щоб тест
 * ловив розбіжність між читанням і інвалідацією.
 */
export const cacheMock = {
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheDisconnect: jest.fn().mockResolvedValue(undefined),
  cacheKeys: {
    postsList: 'posts:list',
    post: (id: number | string) => `post:${id}`,
  },
  redis: null,
  DEFAULT_TTL: 60,
}

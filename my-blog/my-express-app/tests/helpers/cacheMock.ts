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
  getListVersion: jest.fn().mockResolvedValue(1),
  bumpListVersion: jest.fn().mockResolvedValue(undefined),
  cacheKeys: {
    listVersion: 'posts:list:version',
    postsList: (version: number, page: number, limit: number) =>
      `posts:list:v${version}:p${page}:l${limit}`,
    post: (id: number | string) => `post:${id}`,
  },
  redis: null,
  DEFAULT_TTL: 60,
}

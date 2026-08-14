/**
 * Конфіг для ЮНІТ-тестів.
 * Тут немає жодної реальної бази — Prisma повністю замокана,
 * тому тести швидкі й запускаються будь-де (в тому числі в CI).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/types/**',
  ],
}

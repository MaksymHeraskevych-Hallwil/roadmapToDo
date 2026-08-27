/**
 * Конфіг для ІНТЕГРАЦІЙНИХ тестів.
 * Вони піднімають увесь Express-застосунок (supertest) і ходять
 * у справжній PostgreSQL з docker-compose.test.yml.
 *
 * Запуск: npm run test:integration
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  // Тести ділять одну базу — виконуємо їх послідовно.
  maxWorkers: 1,
  testTimeout: 30000,
}

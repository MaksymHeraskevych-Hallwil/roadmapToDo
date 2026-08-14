import prisma from '../../src/lib/prisma'
import { redis, cacheDisconnect } from '../../src/lib/cache'

// Захист від випадкового запуску по «живій» базі.
if (!/blog_test/.test(process.env.DATABASE_URL || '')) {
  throw new Error(
    'Інтеграційні тести очікують тестову базу (blog_test). ' +
      'Запускай їх через `npm run test:integration`.'
  )
}

// Кожен тест починається з чистої бази і порожнього кешу — так вони
// не залежать від порядку виконання. Без flush закешований список
// постів «протікав» би з попереднього тесту.
beforeEach(async () => {
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.user.deleteMany()
  if (redis) await redis.flushall()
})

afterAll(async () => {
  await prisma.$disconnect()
  await cacheDisconnect()
})

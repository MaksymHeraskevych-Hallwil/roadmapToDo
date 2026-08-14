import { PrismaClient } from '@prisma/client'

// Один інстанс PrismaClient на весь застосунок.
// Так ми не відкриваємо зайві пули з'єднань і маємо
// єдину точку, яку зручно мокати в юніт-тестах.
const prisma = new PrismaClient()

export default prisma

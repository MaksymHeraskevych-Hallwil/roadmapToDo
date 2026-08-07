import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET

// Реєстрація нового користувача
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Перевіряємо, чи email вже існує
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email вже зареєстрований' })
    }

    // Хешуємо пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Створюємо користувача
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })

    res.status(201).json({
      message: 'Користувач створений',
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
}

// Вхід користувача
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Шукаємо користувача
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Неправильний email або пароль' })
    }

    // Перевіряємо пароль
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неправильний email або пароль' })
    }

    // Створюємо JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      message: 'Вхід успішний',
      token,
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    console.error('LOGIN ERROR:', error)
    res.status(500).json({ error: 'Помилка сервера' })
  }
}
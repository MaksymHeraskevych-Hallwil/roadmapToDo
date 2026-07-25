import jwt from 'jsonwebtoken'

export default (req: any, res: any, next: any) => {
  // Отримуємо токен з заголовка
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потрібен токен автентифікації' })
  }

  const token = authHeader.substring(7) // прибираємо "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // додаємо дані користувача до запиту
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Невірний токен' })
  }
}
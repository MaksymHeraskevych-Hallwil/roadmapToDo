// Розширюємо тип Request, щоб authMiddleware міг класти
// туди дані користувача з JWT.
export interface JwtUser {
  userId: number
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser
      // Розібрані параметри запиту з validate(schema, 'query').
      // Окреме поле, бо req.query в Express 5 лише для читання.
      validatedQuery?: any
    }
  }
}

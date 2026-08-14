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
    }
  }
}

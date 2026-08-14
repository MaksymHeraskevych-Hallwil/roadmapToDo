import request from 'supertest'
import app from '../../src/app'

export interface TestUser {
  id: number
  email: string
  token: string
  auth: string
}

let counter = 0

/**
 * Реєструє користувача через справжній HTTP-роут і логінить його.
 * Повертає готовий заголовок Authorization.
 */
export const createUser = async (name = 'User'): Promise<TestUser> => {
  const email = `user${++counter}-${Date.now()}@test.com`
  const password = 'password123'

  const registered = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name })
    .expect(201)

  const loggedIn = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)

  return {
    id: registered.body.user.id,
    email,
    token: loggedIn.body.token,
    auth: `Bearer ${loggedIn.body.token}`,
  }
}

/** Створює пост від імені переданого користувача. */
export const createPost = async (user: TestUser, title = 'Title', content = 'Content') => {
  const res = await request(app)
    .post('/api/posts')
    .set('Authorization', user.auth)
    .send({ title, content })
    .expect(201)

  return res.body
}

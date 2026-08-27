import express from 'express'
import { register, login } from '../controllers/auth.controller'
import validate from '../middlewares/validate.middleware'
import { registerSchema, loginSchema } from '../schemas'

const router = express.Router()

// POST /api/auth/register — реєстрація
router.post('/register', validate(registerSchema), register)

// POST /api/auth/login — вхід
router.post('/login', validate(loginSchema), login)

export default router

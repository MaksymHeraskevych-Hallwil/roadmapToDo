import express from 'express'
import { register, login } from '../controllers/auth.controller'

const router = express.Router()

// POST /api/auth/register — реєстрація
router.post('/register', register)

// POST /api/auth/login — вхід
router.post('/login', login)

export default router
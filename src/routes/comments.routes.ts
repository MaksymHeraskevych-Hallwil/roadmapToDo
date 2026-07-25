import express from 'express'
import {
  createComment,
  updateComment,
  deleteComment
} from '../controllers/comments.controller'
import authMiddleware from '../middlewares/auth.middleware'

const router = express.Router()

// Усі роути коментарів захищені (потребують токен)
router.post('/', authMiddleware, createComment)
router.put('/:id', authMiddleware, updateComment)
router.delete('/:id', authMiddleware, deleteComment)

export default router
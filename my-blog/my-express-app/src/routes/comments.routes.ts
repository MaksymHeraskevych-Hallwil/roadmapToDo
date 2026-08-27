import express from 'express'
import {
  createComment,
  updateComment,
  deleteComment
} from '../controllers/comments.controller'
import authMiddleware from '../middlewares/auth.middleware'
import validate from '../middlewares/validate.middleware'
import {
  createCommentSchema,
  updateCommentSchema,
  idParamSchema,
} from '../schemas'

const router = express.Router()

// Усі роути коментарів захищені (потребують токен)
router.post('/', authMiddleware, validate(createCommentSchema), createComment)
router.put(
  '/:id',
  authMiddleware,
  validate(idParamSchema, 'params'),
  validate(updateCommentSchema),
  updateComment
)
router.delete(
  '/:id',
  authMiddleware,
  validate(idParamSchema, 'params'),
  deleteComment
)

export default router

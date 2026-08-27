import express from 'express'
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
} from '../controllers/posts.controller'
import authMiddleware from '../middlewares/auth.middleware'
import validate from '../middlewares/validate.middleware'
import {
  createPostSchema,
  updatePostSchema,
  paginationSchema,
  idParamSchema,
} from '../schemas'

const router = express.Router()

// Публічні роути
router.get('/', validate(paginationSchema, 'query'), getAllPosts)
router.get('/:id', validate(idParamSchema, 'params'), getPost)

// Захищені роути (потребують токен).
// Порядок middleware важливий: спершу перевіряємо, ХТО це (401),
// і лише потім — чи коректні дані (400).
router.post('/', authMiddleware, validate(createPostSchema), createPost)
router.put(
  '/:id',
  authMiddleware,
  validate(idParamSchema, 'params'),
  validate(updatePostSchema),
  updatePost
)
router.delete(
  '/:id',
  authMiddleware,
  validate(idParamSchema, 'params'),
  deletePost
)

export default router

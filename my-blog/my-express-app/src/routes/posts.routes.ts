import express from 'express'
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
} from '../controllers/posts.controller'
import authMiddleware from '../middlewares/auth.middleware'

const router = express.Router()

// Публічні роути
router.get('/', getAllPosts)
router.get('/:id', getPost)

// Захищені роути (потребують токен)
router.post('/', authMiddleware, createPost)
router.put('/:id', authMiddleware, updatePost)
router.delete('/:id', authMiddleware, deletePost)

export default router
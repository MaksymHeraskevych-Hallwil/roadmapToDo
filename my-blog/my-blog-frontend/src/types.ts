/** Форми даних, які віддає API. Одне джерело правди для всіх сторінок. */

export interface Author {
  id: number
  name: string | null
}

export interface Comment {
  id: number
  content: string
  postId: number
  authorId: number
  author: Author
  createdAt: string
}

export interface Media {
  id: number
  url: string
  mimeType?: string
  size?: number
}

export interface Post {
  id: number
  title: string
  content: string
  published: boolean
  authorId: number
  author: Author
  image: Media | null
  createdAt: string
  updatedAt: string
}

/** Пост зі сторінки /posts/:id — приходить разом з коментарями */
export interface PostWithComments extends Post {
  comments: Comment[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Відповідь посторінкового списку: { data, meta } */
export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface AuthUser {
  id: number
  email: string
  name: string | null
}

export interface AuthResponse {
  message: string
  token: string
  user: AuthUser
}

/**
 * Тонка обгортка над нативним fetch — замість axios.
 *
 * Причина проста: усе, заради чого зазвичай беруть axios (базовий URL,
 * JSON, заголовок з токеном, помилка на 4xx/5xx), тут займає 60 рядків,
 * а зайва залежність у package.json — це ще одна точка входу для
 * supply-chain атаки в npm.
 */

// Беремо URL зі змінних середовища.
// В Docker (через Nginx) — це відносний `/api`, тобто той самий origin.
// Локально без Docker — падаємо на 5050 порт.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

/** Тіло помилки, яке віддає бекенд. */
interface ErrorBody {
  error?: string
  details?: { field: string; message: string }[]
}

/** Помилка з відповіді сервера: тримає статус і розпарсене тіло. */
export class ApiError extends Error {
  status: number
  data: ErrorBody | null

  constructor(status: number, data: unknown) {
    const body = (data ?? null) as ErrorBody | null
    super(body?.error || `Запит завершився помилкою ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = body
  }
}

const authHeader = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('blog-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const request = async <T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 204 (наприклад, після DELETE) тіла не має — парсити нічого
  const payload =
    res.status === 204 || res.headers.get('content-length') === '0'
      ? null
      : await res.json().catch(() => null)

  // fetch, на відміну від axios, не кидає помилку на 4xx/5xx — робимо це самі
  if (!res.ok) throw new ApiError(res.status, payload)

  return payload as T
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}

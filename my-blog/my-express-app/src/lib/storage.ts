import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

/**
 * Об'єктне сховище для картинок.
 *
 * Cloudflare R2 сумісний із S3 API, тому тут один код і для нього, і для
 * MinIO, який ми піднімаємо локально в docker-compose. Перехід на R2 —
 * це зміна змінних середовища, а не коду:
 *
 *   S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
 *   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY — з панелі R2
 *   S3_PUBLIC_URL=https://pub-<hash>.r2.dev   (публічний домен бакета)
 */

const {
  S3_ENDPOINT,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_PUBLIC_URL,
  S3_REGION,
} = process.env

/** Без налаштувань сховище просто вимкнене — так працюють юніт-тести. */
export const isStorageEnabled = Boolean(
  S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
)

export const s3 = isStorageEnabled
  ? new S3Client({
      // R2 не має регіонів, але SDK вимагає значення — 'auto' саме для нього
      region: S3_REGION || 'auto',
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID!,
        secretAccessKey: S3_SECRET_ACCESS_KEY!,
      },
      // MinIO адресує бакет шляхом (endpoint/bucket/key), а не піддоменом.
      // R2 з таким теж працює, тому вмикаємо завжди.
      forcePathStyle: true,
    })
  : null

/** Дозволені типи. Ключ — MIME, значення — розширення файлу. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 МБ

/**
 * Визначає справжній тип файлу за сигнатурою перших байтів.
 *
 * Заголовок Content-Type присилає клієнт, тобто йому не можна вірити:
 * .exe легко віддати як image/png. Магічні байти підробити складніше.
 */
export const detectImageType = (buffer: Buffer): string | null => {
  if (buffer.length < 12) return null

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return 'image/png'
  }
  // GIF: "GIF87a" або "GIF89a"
  if (buffer.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) {
    return 'image/gif'
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

/** Генерує унікальний ключ об'єкта. Ім'я від користувача не використовуємо. */
export const buildObjectKey = (mimeType: string): string => {
  const ext = ALLOWED_IMAGE_TYPES[mimeType] || 'bin'
  const now = new Date()
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return `images/${folder}/${randomUUID()}.${ext}`
}

/** Кладе файл у бакет і повертає публічний URL. */
export const uploadObject = async (
  key: string,
  body: Buffer,
  mimeType: string
): Promise<string> => {
  if (!s3) throw new Error('Сховище не налаштоване')

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: mimeType,
      // Рік кешу: ключ унікальний, тому вміст за ним ніколи не зміниться
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  return `${(S3_PUBLIC_URL || '').replace(/\/$/, '')}/${key}`
}

/** Прибирає файл зі сховища. Помилку ковтаємо: запис у БД важливіший. */
export const deleteObject = async (key: string): Promise<void> => {
  if (!s3) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  } catch (error) {
    console.warn('[storage] не вдалось видалити об’єкт', key)
  }
}

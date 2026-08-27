import {
  detectImageType,
  buildObjectKey,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from '../../src/lib/storage'

/** Мінімальні валідні заголовки файлів */
const headers = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]),
  png: Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    Buffer.alloc(8),
  ]),
  gif: Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.alloc(8)]),
  webp: Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.alloc(4),
    Buffer.from('WEBP', 'ascii'),
  ]),
}

describe('detectImageType — тип за вмістом, не за заголовком клієнта', () => {
  it('впізнає JPEG', () => {
    expect(detectImageType(headers.jpeg)).toBe('image/jpeg')
  })

  it('впізнає PNG', () => {
    expect(detectImageType(headers.png)).toBe('image/png')
  })

  it('впізнає GIF', () => {
    expect(detectImageType(headers.gif)).toBe('image/gif')
  })

  it('впізнає WebP', () => {
    expect(detectImageType(headers.webp)).toBe('image/webp')
  })

  it('відхиляє виконуваний файл, навіть якщо клієнт назве його картинкою', () => {
    // ELF-заголовок: типовий Linux-бінарник
    const elf = Buffer.concat([
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
      Buffer.alloc(12),
    ])

    expect(detectImageType(elf)).toBeNull()
  })

  it('відхиляє текст, який прикинувся png', () => {
    expect(detectImageType(Buffer.from('це звичайний текст, не картинка'))).toBeNull()
  })

  it('відхиляє надто короткий файл без падіння', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull()
  })

  it('відхиляє порожній буфер', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })
})

describe('buildObjectKey', () => {
  it('дає розширення за типом і не бере ім’я від користувача', () => {
    const key = buildObjectKey('image/png')

    expect(key).toMatch(/^images\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/)
  })

  it('два виклики дають різні ключі — файли не перезатруть один одного', () => {
    expect(buildObjectKey('image/jpeg')).not.toBe(buildObjectKey('image/jpeg'))
  })

  it('розкладає файли по теках рік/місяць', () => {
    const now = new Date()
    const expected = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    expect(buildObjectKey('image/webp')).toContain(`images/${expected}/`)
  })
})

describe('налаштування', () => {
  it('дозволені лише чотири типи зображень', () => {
    expect(Object.keys(ALLOWED_IMAGE_TYPES).sort()).toEqual([
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
  })

  it('ліміт розміру — 5 МБ', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024)
  })
})

const PRODUCT_HEADERS = [
  'merchantProductId',
  'productId',
  'productType',
  'nominalAmount',
  'nominalCurrency',
  'maxQuantity',
  'enabled',
  'metadataJson',
]

export function safeAppleError(error: any) {
  const raw = typeof error === 'string' ? error : error && (error.msg || error.message)
  return String(raw || '请求未完成')
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[REDACTED]')
    .replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWS]')
    .replace(/(\/notifications\/v2\/)[A-Za-z0-9_-]+/g, '$1[REDACTED_TOKEN]')
    .replace(/\b[A-Za-z0-9_-]{43}\b/g, '[REDACTED_TOKEN]')
    .slice(0, 300)
}

export function formatAppleTime(value: any) {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString()
}

export function formatScaledAmount(value: any, scale: any, currency: any) {
  if (value === null || value === undefined || value === '') return '-'
  const parsedScale = Number(scale)
  const digits = Number.isInteger(parsedScale) ? Math.min(9, Math.max(0, parsedScale)) : 0
  const raw = String(value)
  if (!/^-?\d+$/.test(raw)) return `${String(currency || '').toUpperCase()} ${raw}`.trim()
  const negative = raw.startsWith('-')
  const absolute = negative ? raw.slice(1) : raw
  const padded = absolute.padStart(digits + 1, '0')
  const decimal = digits ? `${padded.slice(0, -digits)}.${padded.slice(-digits)}` : padded
  return `${String(currency || '').toUpperCase()} ${negative ? '-' : ''}${decimal}`.trim()
}

export function newAppleIdempotencyKey() {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    throw new Error('当前浏览器不支持安全 UUID，请升级浏览器后重试')
  }
  return globalThis.crypto.randomUUID()
}

export function releaseApplePayloadDownload(response: any, fallbackName = 'apple-iap-payload.bin') {
  if (!response || typeof Blob === 'undefined' || !(response.data instanceof Blob)) {
    throw new Error('敏感载荷下载响应格式无效')
  }
  const disposition = String((response.headers && response.headers['content-disposition']) || '')
  const rawName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName
  const fileName = rawName.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 128) || fallbackName
  const objectUrl = globalThis.URL.createObjectURL(response.data)
  const anchor = globalThis.document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  globalThis.document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(objectUrl), 1000)
  return {
    auditId: String((response.headers && response.headers['x-apple-iap-audit-id']) || ''),
    fileName,
  }
}

export function parseAppleProductCsv(text: string) {
  const matrix = parseCsvMatrix(String(text || '').replace(/^\uFEFF/, ''))
  if (matrix.length < 2) throw new Error('CSV 必须包含表头和至少一行商品数据')
  const headers = matrix[0].map((value) => value.trim())
  if (
    headers.length !== PRODUCT_HEADERS.length ||
    headers.some((value, index) => value !== PRODUCT_HEADERS[index])
  ) {
    throw new Error('CSV 表头必须严格为：' + PRODUCT_HEADERS.join(','))
  }
  const dataRows = matrix
    .slice(1)
    .map((values, index) => ({ values, lineNumber: index + 2 }))
    .filter(({ values }) => values.some((value) => value.trim() !== ''))
  if (!dataRows.length) throw new Error('CSV 没有可预览的商品行')
  if (dataRows.length > 500) throw new Error('CSV 最多允许 500 行商品数据')

  return dataRows.map(({ values, lineNumber }) => {
    if (values.length > PRODUCT_HEADERS.length) {
      throw new Error(`CSV 第 ${lineNumber} 行字段数超过表头，请检查未转义的逗号`)
    }
    const row = Object.fromEntries(
      PRODUCT_HEADERS.map((header, index) => [header, (values[index] || '').trim()])
    )
    return {
      lineNumber,
      merchantProductId: row.merchantProductId || null,
      productId: row.productId || null,
      productType: row.productType || 'CONSUMABLE',
      nominalAmount: integerOrNull(row.nominalAmount),
      nominalCurrency: row.nominalCurrency || null,
      maxQuantity: row.maxQuantity ? integerOrNull(row.maxQuantity) : 1,
      enabled: booleanOrNull(row.enabled),
      metadataJson: row.metadataJson || null,
    }
  })
}

function integerOrNull(value: string) {
  if (!/^-?\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function booleanOrNull(value: string) {
  if (!value) return false
  if (/^(true|1|yes)$/i.test(value)) return true
  if (/^(false|0|no)$/i.test(value)) return false
  return null
}

function parseCsvMatrix(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"' && field === '') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }
  if (quoted) throw new Error('CSV 存在未闭合的双引号')
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

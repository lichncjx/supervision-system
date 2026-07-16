import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = '24h'
const EXCEL_IMPORT_PREVIEW_EXPIRES_IN = '15m'
const DEVELOPMENT_JWT_SECRET = 'supersecretkey'
const AUTH_TOKEN_PURPOSE = 'auth'
const EXCEL_IMPORT_PREVIEW_TOKEN_PURPOSE = 'excel-import-preview'

function isPlaceholderSecret(value: string) {
  return value.includes('请填写') || value.includes('请修改') || value.includes('change-me')
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()

  if (secret && secret !== DEVELOPMENT_JWT_SECRET && !isPlaceholderSecret(secret)) {
    return secret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置有效的 JWT_SECRET，不能留空、使用默认值或模板占位符')
  }

  return secret || DEVELOPMENT_JWT_SECRET
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId, purpose: AUTH_TOKEN_PURPOSE }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): { userId: number } | null {
  const secret = getJwtSecret()

  try {
    const decoded = jwt.verify(token, secret) as {
      userId?: unknown
      purpose?: unknown
    }
    if (
      typeof decoded.userId !== 'number' ||
      (decoded.purpose !== undefined && decoded.purpose !== AUTH_TOKEN_PURPOSE)
    ) {
      return null
    }
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

export interface ExcelImportPreviewTokenPayload {
  userId: number
  type: 'priority' | 'main' | 'todo'
  assessmentYear: number
  fileHash: string
}

export function signExcelImportPreviewToken(payload: ExcelImportPreviewTokenPayload): string {
  return jwt.sign({ ...payload, purpose: EXCEL_IMPORT_PREVIEW_TOKEN_PURPOSE }, getJwtSecret(), {
    expiresIn: EXCEL_IMPORT_PREVIEW_EXPIRES_IN,
  })
}

export function verifyExcelImportPreviewToken(
  token: string,
): ExcelImportPreviewTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as Partial<
      ExcelImportPreviewTokenPayload & { purpose: string }
    >
    if (
      decoded.purpose !== EXCEL_IMPORT_PREVIEW_TOKEN_PURPOSE ||
      typeof decoded.userId !== 'number' ||
      !['priority', 'main', 'todo'].includes(decoded.type || '') ||
      typeof decoded.assessmentYear !== 'number' ||
      typeof decoded.fileHash !== 'string'
    ) {
      return null
    }

    return {
      userId: decoded.userId,
      type: decoded.type as ExcelImportPreviewTokenPayload['type'],
      assessmentYear: decoded.assessmentYear,
      fileHash: decoded.fileHash,
    }
  } catch {
    return null
  }
}

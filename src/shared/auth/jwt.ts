import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = '24h'
const EXCEL_IMPORT_PREVIEW_EXPIRES_IN = '15m'
const DEVELOPMENT_JWT_SECRET = 'supersecretkey'

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
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): { userId: number } | null {
  const secret = getJwtSecret()

  try {
    const decoded = jwt.verify(token, secret) as { userId: number }
    return decoded
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
  return jwt.sign({ ...payload, purpose: 'excel-import-preview' }, getJwtSecret(), {
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
      decoded.purpose !== 'excel-import-preview' ||
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

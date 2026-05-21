import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = '24h'
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

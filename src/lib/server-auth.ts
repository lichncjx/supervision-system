
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import prisma from './prisma'
import { Role, User } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'
const JWT_EXPIRES_IN = '24h'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    return decoded
  } catch {
    return null
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const decoded = verifyToken(token)
  if (!decoded) return null

  return prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { department: true },
  })
}

const COMPANY_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.VICE_PRESIDENT, Role.PRESIDENT]
const DEPT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]
const APPROVE_DEPT_ROLES: Role[] = [Role.DEPARTMENT_LEADER]
const APPROVE_COMPANY_ROLES: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT]
const IMPORT_EXPORT_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]

export function isCompanyLevelRole(role: Role): boolean {
  return COMPANY_ROLES.includes(role)
}

export function isDepartmentLevelRole(role: Role): boolean {
  return DEPT_ROLES.includes(role)
}

export function canApproveDepartmentLevel(role: Role): boolean {
  return APPROVE_DEPT_ROLES.includes(role)
}

export function canApproveCompanyLevel(role: Role): boolean {
  return APPROVE_COMPANY_ROLES.includes(role)
}

export function canApproveMainLeaderCancel(role: Role): boolean {
  return role === Role.PRESIDENT
}

export function canImportExport(role: Role): boolean {
  return IMPORT_EXPORT_ROLES.includes(role)
}

export function isSupervisionAdmin(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPERVISOR
}

export function canCreateWorkItem(role: Role): boolean {
  return !IMPORT_EXPORT_ROLES.includes(role) || role === Role.ADMIN
}

export function canAccessAllData(role: Role): boolean {
  return COMPANY_ROLES.includes(role)
}

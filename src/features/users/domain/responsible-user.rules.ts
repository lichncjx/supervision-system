import { Role } from '@prisma/client'

export interface ResponsibleUserCandidate {
  role: Role | string
}

export function isValidResponsibleLeaderUser(user: ResponsibleUserCandidate): boolean {
  return user.role === Role.DEPARTMENT_LEADER
}

export function isValidResponsiblePersonUser(user: ResponsibleUserCandidate): boolean {
  return user.role !== Role.DEPARTMENT_LEADER
}


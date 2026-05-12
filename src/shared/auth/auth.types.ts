import type { User, Department } from '@prisma/client'

export type AuthUser = User & { department: Department | null }

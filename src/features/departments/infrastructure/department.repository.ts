import { prisma } from '@/shared/db/prisma'

export interface Department {
  id: number
  name: string
  code: string
  isBusiness: boolean
}

const DEPARTMENT_CACHE_TTL_MS = 5 * 60 * 1000

let cache: { departments: Department[]; expiresAt: number } | null = null

export function clearDepartmentCache(): void {
  cache = null
}

async function loadAllDepartments(): Promise<Department[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.departments
  }

  const departments = await prisma.department.findMany({
    orderBy: { id: 'asc' },
  })
  cache = {
    departments,
    expiresAt: Date.now() + DEPARTMENT_CACHE_TTL_MS,
  }

  return departments
}

export async function findAllDepartments(): Promise<Department[]> {
  return loadAllDepartments()
}

export async function findDepartmentById(
  id: number,
): Promise<Department | null> {
  const all = await loadAllDepartments()
  return all.find((d) => d.id === id) ?? null
}

export async function findDepartmentsByIds(
  ids: number[],
): Promise<Department[]> {
  const idSet = new Set(ids)
  const all = await loadAllDepartments()
  return all.filter((d) => idSet.has(d.id) && d.isBusiness)
}

export async function findBusinessDepartments(): Promise<Department[]> {
  const all = await loadAllDepartments()
  return all
    .filter((d) => d.isBusiness)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function findDepartmentsForImport(): Promise<Department[]> {
  const all = await loadAllDepartments()
  return all.filter((d) => d.isBusiness)
}

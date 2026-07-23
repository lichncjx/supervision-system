import assert from 'node:assert/strict'
import { Role } from '@prisma/client'
import {
  DASHBOARD_NOTICE_MAX_LENGTH,
  getNaturalAssessmentYear,
  normalizeDashboardNotice,
  normalizeDefaultAssessmentYear,
} from '@/features/system-settings/domain/system-settings.rules'
import {
  getQueryYearPreference,
  resolveQueryAssessmentYear,
  saveQueryYearPreference,
} from '@/features/system-settings/client/query-year-preference'
import {
  getSystemSettingsUseCase,
  updateSystemSettingsUseCase,
  type SystemSettingsDependencies,
} from '@/features/system-settings/application/system-settings.usecase'
import { prepareWorkCreateData } from '@/features/works/application/create-work.usecase'
import { createWorkDraftsBatchUseCase } from '@/features/works/application/create-work-drafts-batch.usecase'
import { inspectExcelImport } from '@/features/excel/application/inspect-excel-import.usecase'
import {
  exportWorksToExcelUseCase,
  type ExportWorksToExcelDependencies,
} from '@/features/excel/application/export-works-to-excel.usecase'
import { queryWorks } from '@/features/works/client/work-api'
import type { BaseCurrentUser } from '@/shared/auth/current-user'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const localStorage = new MemoryStorage()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage },
})

const admin: BaseCurrentUser = {
  id: 1,
  name: '系统管理员',
  role: Role.ADMIN,
  departmentId: 1,
}
const departmentManager: BaseCurrentUser = {
  id: 2,
  name: '部门办理人',
  role: Role.DEPARTMENT_MANAGER,
  departmentId: 2,
}

function createSetting(overrides: Partial<{
  defaultAssessmentYear: number
  dashboardNotice: string | null
  updatedAt: Date
  updatedBy: { id: number; name: string } | null
}> = {}) {
  return {
    defaultAssessmentYear: 2028,
    dashboardNotice: '统一督办提示',
    updatedAt: new Date('2026-07-23T00:00:00.000Z'),
    updatedBy: { id: admin.id, name: admin.name },
    ...overrides,
  }
}

function createDependencies(
  overrides: Partial<SystemSettingsDependencies> = {},
): SystemSettingsDependencies {
  return {
    findSystemSetting: async () => createSetting(),
    createSystemSetting: async (input) => createSetting({
      defaultAssessmentYear: input.defaultAssessmentYear,
      dashboardNotice: input.dashboardNotice,
    }),
    updateSystemSettingByVersion: async (input) => createSetting({
      defaultAssessmentYear: input.defaultAssessmentYear,
      dashboardNotice: input.dashboardNotice,
      updatedAt: input.updatedAt,
    }),
    createSystemSettingOperationLog: async () => ({ id: 1 }) as never,
    ...overrides,
  }
}

function verifyPreferences() {
  assert.equal(normalizeDefaultAssessmentYear('2028'), 2028)
  assert.equal(normalizeDefaultAssessmentYear('all'), null)
  assert.equal(normalizeDashboardNotice('  提示内容\n  '), '提示内容')
  assert.equal(
    normalizeDashboardNotice('x'.repeat(DASHBOARD_NOTICE_MAX_LENGTH + 1)),
    undefined,
  )

  saveQueryYearPreference(101, 2027)
  saveQueryYearPreference(202, 2029)
  saveQueryYearPreference(101, 'all')
  assert.equal(getQueryYearPreference(101), 2027)
  assert.equal(getQueryYearPreference(202), 2029)
  assert.equal(
    resolveQueryAssessmentYear({ explicitYear: '2030', userId: 101, defaultYear: 2028 }),
    2030,
  )
  assert.equal(
    resolveQueryAssessmentYear({ explicitYear: null, userId: 101, defaultYear: 2028 }),
    2027,
  )
  assert.equal(
    resolveQueryAssessmentYear({ explicitYear: null, userId: 303, defaultYear: 2028 }),
    2028,
  )
  localStorage.setItem('supervision:query-assessment-year:404', 'invalid')
  assert.equal(getQueryYearPreference(404), null)
}

async function verifyWriteYearGuards() {
  const createResult = await prepareWorkCreateData({
    currentUser: departmentManager,
    body: {
      type: 'priority',
      assessmentYear: null,
      departmentId: departmentManager.departmentId,
      workItem: '年度事项',
      workNode: '节点一',
    },
  })
  assert.equal(createResult.ok, false)
  if (!createResult.ok) {
    assert.equal(createResult.status, 400)
    assert.equal(createResult.message, '请选择有效年度')
  }

  const batchResult = await createWorkDraftsBatchUseCase({
    currentUser: departmentManager,
    type: 'priority',
    assessmentYear: undefined as unknown as number,
    workItem: '年度事项',
    nodes: [
      { departmentId: 2, workNode: '节点一' },
      { departmentId: 2, workNode: '节点二' },
    ],
  })
  assert.equal(batchResult.ok, false)
  if (!batchResult.ok) {
    assert.equal(batchResult.status, 400)
    assert.match(batchResult.message, /请选择有效年度/)
  }

  const importResult = await inspectExcelImport({
    currentUser: departmentManager,
    type: 'priority',
    fileBuffer: Buffer.alloc(0),
    assessmentYear: null,
  })
  assert.equal(importResult.assessmentYear, null)
  assert.equal(importResult.errors[0]?.reason, '请选择有效年度')

  const exportResult = await exportWorksToExcelUseCase({
    currentUser: admin,
    type: 'priority',
    status: null,
    departmentId: null,
    keyword: null,
    assessmentYear: null,
    workItem: '同名工作事项',
    month: null,
  })
  assert.equal(exportResult.ok, false)
  if (!exportResult.ok) {
    assert.equal(exportResult.status, 400)
    assert.equal(exportResult.message, '精确工作事项筛选必须同时指定类型和年度')
  }
}

async function verifyReadAndExportYearScope() {
  const requestedUrls: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input))
    return new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    await queryWorks({ assessmentYear: null })
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.match(requestedUrls[0] ?? '', /assessmentYear=all/)

  const works = [
    {
      id: 1,
      type: 'PRIORITY',
      status: 'DRAFT',
      assessmentYear: 2028,
      title: '2028事项',
      workItem: '年度事项',
      workNode: '节点一',
      departmentId: 2,
      cooperators: [],
      planCompleteTime: null,
    },
    {
      id: 2,
      type: 'PRIORITY',
      status: 'DRAFT',
      assessmentYear: 2029,
      title: '2029事项',
      workItem: '年度事项',
      workNode: '节点二',
      departmentId: 2,
      cooperators: [],
      planCompleteTime: null,
    },
  ]
  let exportedIds: number[] = []
  let defaultYearReads = 0
  const dependencies: ExportWorksToExcelDependencies = {
    getDefaultAssessmentYear: async () => {
      defaultYearReads += 1
      return 2028
    },
    findWorksForExport: async () => works as never,
    buildWorkVisibilityWhere: async () => ({}),
    generateExportBuffer: (items) => {
      exportedIds = items.map((item) => item.id)
      return { buffer: Buffer.alloc(0), fileName: 'test.xlsx' }
    },
    createExportOperationLog: async () => ({ id: 1 }) as never,
  }

  const defaultYearExport = await exportWorksToExcelUseCase({
    currentUser: admin,
    type: null,
    status: null,
    departmentId: null,
    keyword: null,
    assessmentYear: null,
    workItem: null,
    month: null,
  }, dependencies)
  assert.equal(defaultYearExport.ok, true)
  assert.deepEqual(exportedIds, [1])
  assert.equal(defaultYearReads, 1)

  const allYearsExport = await exportWorksToExcelUseCase({
    currentUser: admin,
    type: null,
    status: null,
    departmentId: null,
    keyword: null,
    assessmentYear: 'all',
    workItem: null,
    month: null,
  }, dependencies)
  assert.equal(allYearsExport.ok, true)
  assert.deepEqual(exportedIds, [1, 2])
  assert.equal(defaultYearReads, 1)
}

async function verifySystemSettingsUseCase() {
  const fallback = await getSystemSettingsUseCase({
    findSystemSetting: async () => {
      throw new Error('database unavailable')
    },
  })
  assert.equal(fallback.defaultAssessmentYear, getNaturalAssessmentYear())
  assert.equal(fallback.dashboardNotice, null)

  let repositoryCalled = false
  const forbidden = await updateSystemSettingsUseCase(
    departmentManager,
    { defaultAssessmentYear: 2028, dashboardNotice: null, updatedAt: null },
    createDependencies({
      findSystemSetting: async () => {
        repositoryCalled = true
        return createSetting()
      },
    }),
  )
  assert.equal(forbidden.ok, false)
  if (!forbidden.ok) {
    assert.equal(forbidden.status, 403)
    assert.equal(forbidden.message, '权限不足')
  }
  assert.equal(repositoryCalled, false)

  const stale = await updateSystemSettingsUseCase(
    admin,
    {
      defaultAssessmentYear: 2029,
      dashboardNotice: '新提示',
      updatedAt: '2026-07-22T00:00:00.000Z',
    },
    createDependencies({ updateSystemSettingByVersion: async () => null }),
  )
  assert.equal(stale.ok, false)
  if (!stale.ok) {
    assert.equal(stale.status, 409)
    assert.equal(stale.message, '系统设置已被其他用户更新，请刷新后重试')
  }

  let logged = false
  const updated = await updateSystemSettingsUseCase(
    admin,
    {
      defaultAssessmentYear: 2029,
      dashboardNotice: '新提示',
      updatedAt: '2026-07-23T00:00:00.000Z',
    },
    createDependencies({
      createSystemSettingOperationLog: async () => {
        logged = true
        return { id: 1 } as never
      },
    }),
  )
  assert.equal(updated.ok, true)
  if (updated.ok) {
    assert.equal(updated.data.defaultAssessmentYear, 2029)
    assert.equal(updated.data.dashboardNotice, '新提示')
  }
  assert.equal(logged, true)
}

async function main() {
  verifyPreferences()
  await verifyWriteYearGuards()
  await verifyReadAndExportYearScope()
  await verifySystemSettingsUseCase()
  console.log('System settings and assessment year regression checks passed')
}

void main()

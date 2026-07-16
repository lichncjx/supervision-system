import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import {
  generateToken,
  signExcelImportPreviewToken,
  verifyExcelImportPreviewToken,
  verifyToken,
} from '@/shared/auth/jwt'
import { validateEffectiveResponsiblePerson } from '@/features/workflow/application/effective-responsible-person.guard'
import { getChangedAdjustmentFields } from '@/features/works/domain/work-adjustment-diff'

async function main() {
  process.env.JWT_SECRET = 'pr116-review-regression-secret'

  const loginToken = generateToken(42)
  assert.deepEqual(verifyToken(loginToken), { userId: 42 })

  const legacyLoginToken = jwt.sign({ userId: 42 }, process.env.JWT_SECRET, { expiresIn: '5m' })
  assert.deepEqual(verifyToken(legacyLoginToken), { userId: 42 })

  const previewPayload = {
    userId: 42,
    type: 'priority' as const,
    assessmentYear: 2026,
    fileHash: 'abc123',
  }
  const previewToken = signExcelImportPreviewToken(previewPayload)
  assert.equal(verifyToken(previewToken), null)
  assert.deepEqual(verifyExcelImportPreviewToken(previewToken), previewPayload)

  const validResponsiblePerson = {
    isActive: true,
    departmentId: 2,
    role: 'DEPARTMENT_MANAGER',
  }
  assert.equal(
    (
      await validateEffectiveResponsiblePerson(
        { responsiblePersonUserId: 7, departmentId: 2 },
        async () => validResponsiblePerson,
      )
    ).ok,
    true,
  )

  for (const responsiblePerson of [
    null,
    { ...validResponsiblePerson, isActive: false },
    { ...validResponsiblePerson, departmentId: 3 },
    { ...validResponsiblePerson, role: 'DEPARTMENT_LEADER' },
  ]) {
    assert.equal(
      (
        await validateEffectiveResponsiblePerson(
          { responsiblePersonUserId: 7, departmentId: 2 },
          async () => responsiblePerson,
        )
      ).ok,
      false,
    )
  }

  assert.deepEqual(
    getChangedAdjustmentFields(
      { workItem: '历史事项', workNode: null, progress: '调整前' },
      { workItem: '历史事项', workNode: '', progress: '调整后' },
    ),
    ['progress'],
  )

  console.log('PR #116 review regression checks passed')
}

void main()

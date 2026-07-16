import assert from 'node:assert/strict'
import {
  deriveWorkDisplayTitle,
  validateStructuredWorkFields,
  validateTodoWorkItem,
} from '@/features/works/domain/work-structure.rules'

assert.equal(
  deriveWorkDisplayTitle({
    type: 'PRIORITY',
    workItem: ' 年度重点事项 ',
    workNode: ' 第一节点 ',
    legacyTitle: '过时物化标题',
  }),
  '年度重点事项｜第一节点',
)

assert.equal(
  deriveWorkDisplayTitle({
    type: 'TODO',
    workItem: ' 领导交办事项 ',
    legacyTitle: '过时待办标题',
  }),
  '领导交办事项',
)

assert.equal(
  deriveWorkDisplayTitle({
    type: 'MAIN',
    workItem: '历史工作事项',
    workNode: null,
    legacyTitle: '历史兼容标题',
  }),
  '历史兼容标题',
)

const structured = validateStructuredWorkFields({ workItem: '事项', workNode: '节点' })
assert.deepEqual(structured, {
  ok: true,
  workItem: '事项',
  workNode: '节点',
  title: '事项｜节点',
})
assert.equal(
  deriveWorkDisplayTitle({
    type: 'MAIN',
    workItem: '事'.repeat(199),
    workNode: '点',
    legacyTitle: '旧标题',
  }),
  '事'.repeat(199) + '｜点',
)
assert.equal(validateStructuredWorkFields({ workItem: '事'.repeat(199), workNode: '点' }).ok, false)
assert.equal(validateTodoWorkItem('待'.repeat(201)).ok, false)

console.log('Work title regression checks passed')
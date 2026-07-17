'use client'

import type { Work } from '@/features/works/client/work-client.types'

interface WorkTitleProps {
  work: Pick<Work, 'title' | 'workItem' | 'businessCategory'>
}

/**
 * title 由服务端根据权威结构字段派生；业务类别仅作为弱化补充，不参与标题生成或业务判断。
 */
export function WorkTitle({ work }: WorkTitleProps) {
  return (
    <>
      {work.title || work.workItem || '-'}
      {work.businessCategory && (
        <span className="ml-2 whitespace-nowrap text-xs font-normal text-slate-400">
          · {work.businessCategory}
        </span>
      )}
    </>
  )
}

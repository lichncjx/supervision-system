'use client'

import type { Work } from '@/features/works/client/work-client.types'

interface WorkTitleProps {
  work: Pick<Work, 'title' | 'workItem' | 'businessCategory'>
}

/**
 * 标题仍以持久化 title 为准；业务类别仅作为展示用的弱化补充，不参与标题生成或业务判断。
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

'use client'

import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SELECT_CONTROL } from '@/features/works/ui/visual-tokens'

interface Member {
  id: number
  name: string
  isLeader: boolean
}

export interface MemberSelectProps {
  departmentId: number | undefined
  value: number | undefined
  onChange: (memberId: number | undefined, name: string) => void
  filterLeaders?: boolean
  placeholder?: string
  disabled?: boolean
}

export function MemberSelect({
  departmentId,
  value,
  onChange,
  filterLeaders,
  placeholder,
  disabled,
}: MemberSelectProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!departmentId) {
      setMembers([])
      return
    }

    let cancelled = false
    setLoading(true)

    const url = new URL('/api/members', window.location.origin)
    url.searchParams.set('departmentId', String(departmentId))
    if (filterLeaders) {
      url.searchParams.set('isLeader', 'true')
    }

    fetch(url.toString(), { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch members')
        return res.json()
      })
      .then((data: Member[]) => {
        if (!cancelled) setMembers(data)
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [departmentId, filterLeaders])

  return (
    <Select
      value={value != null ? String(value) : ''}
      onValueChange={(v) => {
        const member = members.find((m) => m.id === Number(v))
        onChange(member ? member.id : undefined, member?.name ?? '')
      }}
      disabled={disabled || !departmentId || loading}
    >
      <SelectTrigger className={SELECT_CONTROL}>
        <SelectValue
          placeholder={
            loading ? '加载中...' : !departmentId ? '请先选择部门' : (placeholder ?? '请选择')
          }
        />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {m.name}
          </SelectItem>
        ))}
        {members.length === 0 && !loading && (
          <div className="px-2 py-1.5 text-xs text-slate-400">
            {departmentId ? '该部门暂无人员' : '请先选择部门'}
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SELECT_CONTROL } from '@/features/works/ui/visual-tokens'
import { getDepartmentUsers } from '@/features/users/client/user-api'
import type { User } from '@/features/users/client/user-client.types'

export interface UserSelectProps {
  departmentId: number | undefined
  value: number | undefined
  onChange: (userId: number | undefined, name: string) => void
  filterLeaders?: boolean
  excludeLeaders?: boolean
  placeholder?: string
  disabled?: boolean
}

export function UserSelect({
  departmentId,
  value,
  onChange,
  filterLeaders,
  excludeLeaders,
  placeholder,
  disabled,
}: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!departmentId) {
      setUsers([])
      return
    }

    let cancelled = false
    setLoading(true)

    getDepartmentUsers(departmentId)
      .then((data) => {
        if (cancelled) return
        let filtered = data
        if (filterLeaders) {
          filtered = data.filter((u) => u.role === 'DEPARTMENT_LEADER')
        } else if (excludeLeaders) {
          filtered = data.filter((u) => u.role !== 'DEPARTMENT_LEADER')
        }
        setUsers(filtered)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [departmentId, filterLeaders, excludeLeaders])

  return (
    <Select
      value={value ? String(value) : ''}
      onValueChange={(val) => {
        const user = users.find((u) => String(u.id) === val)
        if (user) {
          onChange(user.id, user.name)
        }
      }}
      disabled={disabled || !departmentId || loading}
    >
      <SelectTrigger className={SELECT_CONTROL}>
        <SelectValue placeholder={loading ? '加载中...' : (placeholder || '请选择用户')} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={String(user.id)}>
            {user.name}
            <span className="text-muted-foreground ml-2 text-xs">
              {user.role === 'DEPARTMENT_LEADER' ? '(领导)' : user.role === 'DEPARTMENT_MANAGER' ? '(主管)' : ''}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

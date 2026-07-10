'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/shared/ui/cn'
import { getWorkItemOptions, type WorkItemOption } from '@/features/works/client/work-item-api'

interface WorkItemComboboxProps {
  value: string
  onChange: (value: string) => void
  type: 'priority' | 'main'
  assessmentYear: string
  departmentId?: string | number | null
  label?: string
  placeholder?: string
  error?: string
  onBlur?: () => void
  fieldId?: string
}

export function WorkItemCombobox({
  value,
  onChange,
  type,
  assessmentYear,
  departmentId,
  label = '工作事项',
  placeholder = '选择已有工作事项或创建新事项',
  error,
  onBlur,
  fieldId,
}: WorkItemComboboxProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [options, setOptions] = useState<WorkItemOption[]>([])
  const [loading, setLoading] = useState(false)

  const normalizedKeyword = keyword.trim()
  const hasExactOption = useMemo(
    () => options.some((option) => option.workItem === normalizedKeyword),
    [options, normalizedKeyword],
  )

  useEffect(() => {
    if (!open || !assessmentYear) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const result = await getWorkItemOptions({
          type,
          assessmentYear,
          departmentId,
          keyword: normalizedKeyword,
        }, controller.signal)
        if (!controller.signal.aborted) setOptions(result)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setOptions([])
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [assessmentYear, departmentId, normalizedKeyword, open, type])

  const selectWorkItem = (workItem: string) => {
    onChange(workItem)
    setKeyword('')
    setOpen(false)
    onBlur?.()
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={fieldId}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-10 w-full justify-between rounded-lg border-slate-200 bg-white px-3 text-left font-normal hover:bg-slate-50',
              !value && 'text-slate-400',
              error && 'border-red-400',
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={keyword} onValueChange={setKeyword} placeholder="搜索本部门已有工作事项" />
            <CommandList>
              {loading && <div className="px-3 py-2 text-sm text-slate-400">正在加载…</div>}
              {!loading && <CommandEmpty>没有匹配的已有工作事项</CommandEmpty>}
              {options.length > 0 && (
                <CommandGroup heading="当前可见的已有工作事项">
                  {options.map((option) => (
                    <CommandItem key={option.workItem} value={option.workItem} onSelect={() => selectWorkItem(option.workItem)}>
                      <Check className={cn('mr-2 h-4 w-4', value === option.workItem ? 'opacity-100' : 'opacity-0')} />
                      <span className="min-w-0 flex-1 truncate">{option.workItem}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">可见 {option.visibleNodeCount} 个节点</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {normalizedKeyword && !hasExactOption && (
                <CommandGroup>
                  <CommandItem value={`new-${normalizedKeyword}`} onSelect={() => selectWorkItem(normalizedKeyword)}>
                    <Plus className="mr-2 h-4 w-4" />
                    创建“{normalizedKeyword}”作为新工作事项
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-slate-400">选择已有事项只会让当前节点归属到该事项，不会修改其他节点。</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

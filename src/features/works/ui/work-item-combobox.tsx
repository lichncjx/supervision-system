'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
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
import { ERROR_TEXT, FIELD_LABEL } from '@/features/works/ui/visual-tokens'

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
  onSelectExisting?: (option: WorkItemOption) => void
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
  onSelectExisting,
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

  const finishSelection = () => {
    setKeyword('')
    setOpen(false)
    onBlur?.()
  }

  const selectExistingWorkItem = (option: WorkItemOption) => {
    onChange(option.workItem)
    onSelectExisting?.(option)
    finishSelection()
  }

  const selectNewWorkItem = (workItem: string) => {
    onChange(workItem)
    finishSelection()
  }

  const triggerId = fieldId ? `${fieldId}-trigger` : undefined

  return (
    <div id={fieldId}>
      <label htmlFor={triggerId} className={`${FIELD_LABEL} mb-1`}>
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'border-input h-9 w-full min-w-0 justify-between rounded-md border bg-transparent px-3 py-1 text-left text-sm font-normal shadow-sm transition-[color,box-shadow] hover:bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              !value && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                    <CommandItem key={option.workItem} value={option.workItem} onSelect={() => selectExistingWorkItem(option)}>
                      <Check className={cn('mr-2 h-4 w-4', value === option.workItem ? 'opacity-100' : 'opacity-0')} />
                      <span className="min-w-0 flex-1 truncate">{option.workItem}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">可见 {option.visibleNodeCount} 个节点</span>
                      {(!option.businessCategoryConsistent || (type === 'priority' && !option.isInnovationConsistent)) && (
                        <span className="ml-2 shrink-0 text-xs text-amber-600">属性待确认</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {normalizedKeyword && !hasExactOption && (
                <CommandGroup>
                  <CommandItem value={`new-${normalizedKeyword}`} onSelect={() => selectNewWorkItem(normalizedKeyword)}>
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
      {error && <p className={ERROR_TEXT}>{error}</p>}
    </div>
  )
}

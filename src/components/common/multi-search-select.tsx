'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type MultiSearchSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type MultiSearchSelectProps = {
  options: MultiSearchSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
};

export function MultiSearchSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText = '暂无可选项',
  disabled = false,
  className,
}: MultiSearchSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedValues = React.useMemo(() => new Set(value), [value]);
  const optionMap = React.useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  const handleSelect = (nextValue: string) => {
    if (selectedValues.has(nextValue)) {
      onChange(value.filter((item) => item !== nextValue));
      return;
    }

    onChange([...value, nextValue]);
  };

  const handleRemove = (removedValue: string) => {
    onChange(value.filter((item) => item !== removedValue));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {value.length > 0 ? `已选择 ${value.length} 项` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.has(option.value);

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, option.description ?? '']}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((selectedValue) => {
            const option = optionMap.get(selectedValue);

            return (
              <Badge key={selectedValue} variant="secondary" className="gap-1 pr-1">
                <span>{option?.label ?? selectedValue}</span>
                <button
                  type="button"
                  aria-label={`移除${option?.label ?? selectedValue}`}
                  className="rounded-full p-0.5 hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleRemove(selectedValue)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

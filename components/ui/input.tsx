import * as React from 'react'
import { cn } from '@/lib/utils'
import CustomDatePicker from './customDatePicker'

interface InputProps extends React.ComponentProps<'input'> {}

function Input({ className, type, value, onChange, id, name, placeholder, ...props }: InputProps) {
  // ---------- Date variant ----------
 if (type === 'date') {
  return (
    <CustomDatePicker
      id={id}
      name={name}
      placeholder={placeholder ?? 'Select Date'}
      defaultValue={typeof value === 'string' ? value : undefined}
      minValue={props?.min}
      maxValue={props?.max}
      onChange={(nextValue) => {
        onChange?.({
          target: { value: nextValue, name },
        } as React.ChangeEvent<HTMLInputElement>)
      }}
      className={cn(
        // Keep only visual classes, drop padding that would shift the field
        'bg-white border-border text-xs sm:text-sm',
        className?.replace(/\bpl-\d+\b|\bsm:pl-\d+\b|\bpr-\d+\b|\bsm:pr-\d+\b/g, '').trim()
      )}
    />
  )
}

  // ---------- Regular variant ----------
  return (
    <input
      autoCapitalize="off"
      autoComplete="off"
      autoSave="no"
      type={type}
      data-slot="input"
      id={id}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-white border-gray-300 h-7   sm:h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 text-xs md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
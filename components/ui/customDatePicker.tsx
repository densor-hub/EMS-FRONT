'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar } from "lucide-react"
import { alphaNumericDate, numericCurrentDate } from '@/helpers/formatStrings'

interface CustomDatePickerProps {
  id?: string
  name?: string
  defaultValue?: string
  placeholder?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  showBorder?: boolean
  minValue?: number | string | undefined
  maxValue?: number | string | undefined
  className?: string
  ignoreMax?: boolean
  ignoreMin?: boolean
}

export default function CustomDatePicker({
  id,
  name,
  defaultValue,
  placeholder = 'Select date',
  onChange,
  readOnly = false,
  showBorder = false,
  minValue,
  maxValue,
  className,
  ignoreMax = false,
  ignoreMin = false,
}: CustomDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dateValue, setDateValue] = useState<string>(defaultValue ?? '')

  useEffect(() => {
    setDateValue(defaultValue ?? '')
  }, [defaultValue])

  const handleWrapperClick = () => {
    if (readOnly) return
    const input = inputRef.current
    if (!input || typeof input.showPicker !== 'function') return
    try {
      input.showPicker()
    } catch {
      /* native input handles the tap on mobile */
    }
  }

  const hasValue = Boolean(dateValue || defaultValue)
  const displayValue = hasValue
    ? alphaNumericDate((dateValue || defaultValue) as string)
    : placeholder

  return (
    <div
      onClick={handleWrapperClick}
      className={[
        // 👇 w-full, box-border, and NO extra padding that shifts the field
        'relative w-full cursor-pointer',
        readOnly && 'cursor-default',
        // 👇 user className is applied here, but strip padding classes that misalign the inner field
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Visible field — now guaranteed to fill the wrapper */}
      <div
        className={[
          'flex h-8 sm:h-9 w-full min-w-[150px] items-center justify-between',
          'px-2',                                    // 👈 internal padding for the field
          'border-2 border-[#cad1d7] text-sm',
          !readOnly || showBorder ? 'rounded-md' : 'rounded-none',
          readOnly && showBorder ? 'bg-[rgba(203,202,219,0.34)]' : 'bg-white',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'pointer-events-none select-none truncate',
            hasValue && readOnly
              ? 'text-blue-600 text-xs sm:text-sm'
              : 'text-[#64748b] text-xs sm:text-sm',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {displayValue}
        </span>

        <Calendar className="pointer-events-none shrink-0" size={16} />

        {!readOnly && (
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="date"
            value={dateValue}
            min={!ignoreMin ? minValue : ''}
            max={maxValue ?? (!ignoreMax ? numericCurrentDate('yyyy-mm-dd') : '')}
            onChange={(e) => {
              setDateValue(e.target.value)
              onChange?.(e.target.value)
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [webkit-appearance:none] [webkit-tap-highlight-color:transparent]"
          />
        )}
      </div>
    </div>
  )
}
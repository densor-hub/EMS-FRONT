import * as React from 'react'
import { cn } from '@/lib/utils'

// Helper to format date as "DD-MMM-YYYY"
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  if (isNaN(date.getTime())) return dateString
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(date.getDate()).padStart(2, '0')
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

// Parse alphanumeric date to YYYY-MM-DD
const parseAlphanumericDate = (value: string) => {
  if (!value) return ''
  const match = value.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/)
  if (match) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                    'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const monthIndex = months.indexOf(match[2].toLowerCase())
    if (monthIndex !== -1) {
      return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1]}`
    }
  }
  return ''
}

interface InputProps extends React.ComponentProps<'input'> {}

function Input({ className, type, value, onChange, ...props }: InputProps) {
  const hiddenInputRef = React.useRef<HTMLInputElement>(null)
  const textInputRef = React.useRef<HTMLInputElement>(null)
  const [displayValue, setDisplayValue] = React.useState('')
  const [showNativePicker, setShowNativePicker] = React.useState(false)

  // Update display value when value prop changes
  React.useEffect(() => {
    if (type === 'date' && value) {
      setDisplayValue(formatDate(String(value)))
    } else if (type === 'date') {
      setDisplayValue('')
    }
  }, [value, type])

  // Handle click on the text input - show native date picker
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (type === 'date' && hiddenInputRef.current) {
      e.preventDefault()
      
      // Try to use showPicker() which requires user activation
      try {
        // @ts-ignore - showPicker is supported in modern browsers
        if (hiddenInputRef.current.showPicker) {
          // @ts-ignore
          hiddenInputRef.current.showPicker()
        } else {
          // Fallback for browsers that don't support showPicker
          setShowNativePicker(true)
          hiddenInputRef.current.focus()
          hiddenInputRef.current.click()
        }
      } catch (error) {
        // Fallback if showPicker fails
        console.warn('showPicker not supported, using fallback')
        setShowNativePicker(true)
        hiddenInputRef.current.focus()
        hiddenInputRef.current.click()
      }
    }
  }

  // Handle hidden date input change
  const handleHiddenDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange?.(e)
    setDisplayValue(formatDate(newValue))
    setShowNativePicker(false)
  }

  // Handle text input change (manual typing)
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDisplayValue(raw)
    
    // Try to parse as alphanumeric date
    const parsed = parseAlphanumericDate(raw)
    if (parsed) {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: parsed,
        },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(syntheticEvent)
    } else if (raw === '') {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: '',
        },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(syntheticEvent)
    }
  }

  // Handle blur - hide native picker if it was shown
  const handleBlur = () => {
    setShowNativePicker(false)
  }

  // Date input with alphanumeric display
  if (type === 'date') {
    return (
      <div className="relative">
        {/* Hidden native date input */}
        <input
          ref={hiddenInputRef}
          type="date"
          value={value || ''}
          onChange={handleHiddenDateChange}
          onBlur={handleBlur}
          className={cn(
            "absolute inset-0 opacity-0",
            showNativePicker ? "pointer-events-auto" : "pointer-events-none"
          )}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: showNativePicker ? 'auto' : 'none',
            width: '100%',
            height: '100%',
          }}
          {...props}
        />
        
        {/* Visible text input showing alphanumeric */}
        <input
          ref={textInputRef}
          type="text"
          data-slot="input"
          value={displayValue}
          onChange={handleTextChange}
          onClick={handleClick}
          onFocus={() => {
            // If there's a value, format it properly on focus
            if (value) {
              setDisplayValue(formatDate(String(value)))
            }
          }}
          placeholder="DD-MMM-YYYY"
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-white border-gray-300 h-7   sm:h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 text-xs md:text-sm cursor-pointer relative',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            className,
          )}
          {...props}
        />
      </div>
    )
  }

  // Regular input for other types
  return (
    <input
     autoCapitalize='no'
     autoComplete='off'
     autoSave='no'
      type={type}
      data-slot="input"
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
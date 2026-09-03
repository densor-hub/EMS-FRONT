'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ReactNode, useState, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  discriptionLabel?: string
}

export interface CustomSelectProps {
  // Core props
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onOptionSelect?: (option: SelectOption) => void;
  
  // Placeholder props
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  
  // Styling props
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  
  // Behavior props
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  showSelectedIcon?: boolean;
  
  // Size props
  size?: 'sm' | 'md' | 'lg';
  
  // Render props
  renderItem?: (option: SelectOption) => ReactNode;
  renderSelected?: (option: SelectOption) => ReactNode;
  
  // Error props
  error?: string;
  success?: string;
  
  // Event props
  onBlur?: () => void;
  onFocus?: () => void;
  onClear?: () => void;
}

export function CustomSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  onOptionSelect,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  label,
  className,
  triggerClassName,
  contentClassName,
  itemClassName,
  disabled = false,
  required = false,
  loading = false,
  searchable = false,
  clearable = false,
  showSelectedIcon = true,
  size = 'md',
  renderItem,
  renderSelected,
  error,
  success,
  onBlur,
  onFocus,
  onClear,
}: CustomSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValue, setSelectedValue] = useState<string>(value || defaultValue || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    const option = options.find((opt) => opt.value === newValue);
    if (option) {
      onOptionSelect?.(option);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedValue('');
    onValueChange?.('');
    onClear?.();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 text-xs';
      case 'lg':
        return 'h-12 text-base';
      default:
        return 'h-10 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  // Check if option is selected
  const isSelected = (optionValue: string) => selectedValue === optionValue;

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Select */}
      <Select
        value={selectedValue}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
        required={required}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger
          className={cn(
            'w-full bg-white border border-gray-200 dark:border-gray-700 dark:bg-gray-900',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200',
            disabled && 'cursor-not-allowed opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            success && 'border-green-500',
            getSizeClasses(),
            triggerClassName
          )}
          onBlur={onBlur}
          onFocus={onFocus}
        >
          <div className="flex items-center justify-between w-full">
            <SelectValue
              placeholder={
                loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    Loading...
                  </span>
                ) : (
                  placeholder
                )
              }
            >
              {selectedOption && renderSelected
                ? renderSelected(selectedOption)
                : selectedOption && showSelectedIcon && selectedOption.icon
                ? (
                  <span className="flex items-center gap-2">
                    {selectedOption.icon}
                    {selectedOption.label}
                  </span>
                )
                : selectedOption?.label}
            </SelectValue>

            {clearable && selectedValue && !disabled && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation(); // Stop the event from reaching the trigger
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-2 rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                className="h-3 w-3 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          </div>
        </SelectTrigger>

        <SelectContent
          className={cn(
            'max-h-60 min-w-[200px] overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900',
            contentClassName
          )}
        >
          {/* Search */}
          {searchable && (
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* No results */}
          {filteredOptions.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No options found
            </div>
          )}

          {/* Options */}
          {filteredOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                isSelected(option.value) && 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
                option.disabled && 'cursor-not-allowed opacity-50',
                itemClassName
              )}
            >
              {renderItem ? (
                renderItem(option)
              ) : (
                <div className=" w-full flex items-center gap-2 justfiy-between">
                  <span className='flex items-center '>
                    {option.icon && (
                    <span className={cn('flex-shrink-0', getIconSize())}>
                      {option.icon}
                    </span>
                    )}
                    {option.label}  
                  </span> {option?.discriptionLabel &&  <span className='text-xs'> | {option?.discriptionLabel}</span>}
                </div>
              )}
            </SelectItem>
          ))}

          {/* Loading state */}
          {loading && (
            <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                Loading...
              </div>
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Error/Success messages */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-500 dark:text-green-400">{success}</p>
      )}
    </div>
  );
}
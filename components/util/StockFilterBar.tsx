// components/util/FilterBar.tsx
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Loader2 } from 'lucide-react';

interface StockFilterBarProps {
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  
  // Date filters
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  showDateFilters?: boolean;
  
  // Actions
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
  
  // Labels
  searchLabel?: string;
  startDateLabel?: string;
  endDateLabel?: string;
  applyLabel?: string;
  clearLabel?: string;
  
  // Additional styling
  className?: string;
  cardClassName?: string;
  contentClassName?: string;
}

export function StockFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search by transaction #, location, or ID...',
  showSearch = true,
  
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  showDateFilters = true,
  
  onApply,
  onClear,
  isApplying = false,
  
  searchLabel = 'Search',
  startDateLabel = 'Start Date',
  endDateLabel = 'End Date',
  applyLabel = 'Apply',
  clearLabel = 'Clear',
  
  className = '',
  cardClassName = 'm-2',
  contentClassName = '',
}: StockFilterBarProps) {
  return (
    <Card className={` p-2`} >
      <CardContent className="">
        <div className={`flex flex-col md:flex-row items-center `} >
          {/* Search Bar */}
         <div className='flex flex-col md:flex-row gap-2 w-full'>
           {showSearch && (
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="search" className="text-sm font-medium mb-1.5 block text-left">
                {searchLabel}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 border-2 border-gray-300"
                />
              </div>
            </div>
          )}

         <div className='flex gap-2 justify-center'>
           {/* Start Date */}
          {showDateFilters && (
            <div >
              <Label htmlFor="startDate" className="text-sm font-medium mb-1.5 block text-left">
                {startDateLabel}
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="pl-9 border-2 border-gray-300"
                />
              </div>
            </div>
          )}


           {/* Start Date */}
          {showDateFilters && (
            <div className="">
              <Label htmlFor="endDate" className="text-sm font-medium mb-1.5 block text-left">
                {endDateLabel}
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="endDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="pl-9 border-2 border-gray-300"
                />
              </div>
            </div>
          )}

         </div>
          

         </div>
          {/* Apply Filters Button */}
          <div className='flex gap-2 m-2 relative  md:top-3.5' >
            <Button 
            onClick={onApply}
            className="shrink-0 mb-[2px]"
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              applyLabel
            )}
          </Button>

          {/* Clear Filters Button */}
          <Button 
            onClick={onClear}
            variant="outline"
            className="shrink-0 mb-[2px]"
          >
            {clearLabel}
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StockFilterBar;
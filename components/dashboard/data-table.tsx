'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  onAdd?: () => void;
  onRowClick?: (item: T) => void;
  addLabel?: string;
  emptyMessage?: string;
  pageSize?: number;
  height?: string
}

export function DataTable<T extends { id: string }>({
  title,
  data,
  columns,
  searchKey,
  onAdd,
  onRowClick,
  addLabel = 'Add New',
  emptyMessage = 'No data found',
  height = "h-[calc(100vh-260px)]"
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter data based on search
  const filteredData = searchKey
    ? data.filter(item => {
        const value = item[searchKey];
        return String(value).toLowerCase().includes(search.toLowerCase());
      })
    : data;

  // Paginate data
  const totalPages = Math.ceil(filteredData?.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData?.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getValue = (item: T, key: keyof T | string): unknown => {
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = item;
      for (const k of keys) {
        value = (value as Record<string, unknown>)[k];
      }
      return value;
    }
    return item[key as keyof T];
  };

  return (
    <Card className="border-border gap-0 p-0 mx-2">
      {searchKey && (
        <CardHeader className="border-b border-border pt-2 sm:pt-3 h-[70px] sm:h-15 " >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <CardTitle className="text-xs sm:text-lg font-semibold text-foreground " >{title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2" >
              {searchKey && (
                <div className="relative flex-1 sm:flex-none min-w-[140px] sm:min-w-[200px]">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-7 sm:pl-9 w-full sm:w-64 bg-white border-border text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
              )}
              {onAdd && (
                <Button 
                  onClick={onAdd} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{addLabel}</span>
                  <span className="xs:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      {/* <hr/> */}
      <CardContent className="p-0">
        {/* Single scrollable container */}
        <div className={`overflow-auto  ${height}`} >
          <table className="w-full border-collapse">
            {/* Fixed Header - using native table elements */}
            <thead className="sticky top-0 z-10 bg-emerald-200 shadow-sm">
              <tr className="border-border">
                {columns?.map(column => (
                  <th
                    key={String(column.key)}
                    className={`text-muted-foreground font-medium text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap text-left ${
                      column.sortable ? 'cursor-pointer hover:text-foreground' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <span className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && sortKey === column.key && (
                        <span className="text-[10px] sm:text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-8 sm:py-12 text-muted-foreground text-sm sm:text-base"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map(item => (
                  <tr
                    key={item.id}
                    className={`border-b border-border ${
                      onRowClick ? 'cursor-pointer hover:bg-secondary/100' : ''
                    }`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map(column => (
                      <td
                        key={String(column.key)} 
                        className="text-left py-2 sm:py-1.5 px-2 sm:px-4 text-[10px] md:text-sm whitespace-nowrap"
                      >
                        {column.render
                          ? column.render(item)
                          : String(getValue(item, column.key) ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-t border-border gap-2 sm:gap-0">
          <p className="text-xs md:text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredData?.length)} of{' '}
            {filteredData?.length} entries
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <span className="text-xs md:text-sm text-foreground px-1 sm:px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  /**
   * When true, this column is omitted from the mobile card layout.
   * The desktop table still renders it (and it's still sortable there).
   * Useful for secondary fields that clutter the stacked view.
   */
  hideOnMobile?: boolean;
}

export interface ServerPagination {
  page: number;
  totalPages: number;
  totalCount: number;
  /** Called by DataTable when the user clicks prev/next. */
  onPageChange: (page: number) => void;
  /** Optional: server-side search hook. */
  onSearchChange?: (term: string) => void;
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
  height?: string;

  expandedRowKeys?: string[];
  renderExpandedRow?: (item: T) => React.ReactNode;

  /**
   * 'frontend' (default) — DataTable slices `data` locally.
   * 'backend'            — DataTable shows all rows in `data` and calls
   *                        serverPagination.onPageChange for prev/next.
   *                        Requires `serverPagination`.
   */
  paginationMode?: 'frontend' | 'backend';
  serverPagination?: ServerPagination;
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
  height = 'h-[calc(100vh-300px)]',
  pageSize: initialPageSize = 10,
  expandedRowKeys,
  renderExpandedRow,
  paginationMode = 'frontend',
  serverPagination,
}: DataTableProps<T>) {
  // Enforce the contract early so misconfigs surface in dev.
  if (paginationMode === 'backend' && !serverPagination) {
    throw new Error(
      '[DataTable] paginationMode="backend" requires a `serverPagination` prop.'
    );
  }

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);   // used in frontend mode only
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const safeData: T[] = Array.isArray(data) ? data : [];

  // Columns shown in the mobile card layout.
  const mobileColumns = useMemo(
    () => columns.filter((c) => !c.hideOnMobile),
    [columns]
  );

  // ── Search ──────────────────────────────────────────────────
  // frontend: filter locally. backend: defer to caller via callback.
  const filteredData = useMemo(() => {
    if (paginationMode === 'backend') return safeData;
    if (!searchKey) return safeData;
    const needle = search.trim().toLowerCase();
    if (!needle) return safeData;
    return safeData.filter((item) => {
      const value = item[searchKey];
      return String(value ?? '').toLowerCase().includes(needle);
    });
  }, [safeData, searchKey, search, paginationMode]);

  // ── Sorting ─────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const copy = [...filteredData];
    copy.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDirection === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sortDirection === 'asc' ? -1 : 1;
      if (as > bs) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredData, sortKey, sortDirection]);

  // ── Slice vs. show-all ──────────────────────────────────────
  const isFrontend = paginationMode === 'frontend';

  const clientTotalPages = Math.max(1, Math.ceil(sortedData.length / initialPageSize));
  const clientStartIndex = (currentPage - 1) * initialPageSize;
  const clientPageData = sortedData.slice(clientStartIndex, clientStartIndex + initialPageSize);

  const paginatedData = isFrontend ? clientPageData : sortedData;

  // ── Effective numbers for the footer ────────────────────────
  const effectivePage = isFrontend ? currentPage : serverPagination!.page;
  const effectiveTotalPages = isFrontend
    ? clientTotalPages
    : Math.max(1, serverPagination!.totalPages);
  const effectiveTotalCount = isFrontend
    ? sortedData.length
    : serverPagination!.totalCount;

  const rangeStart = isFrontend
    ? sortedData.length === 0 ? 0 : clientStartIndex + 1
    : sortedData.length === 0 ? 0 : (effectivePage - 1) * initialPageSize + 1;
  const rangeEnd = isFrontend
    ? Math.min(clientStartIndex + initialPageSize, sortedData.length)
    : Math.min(rangeStart + sortedData.length - 1, effectiveTotalCount);

  // Reset local page when search text changes (frontend only).
  useEffect(() => {
    if (isFrontend) setCurrentPage(1);
  }, [search, isFrontend]);

  // Clamp local page when total shrinks (frontend only).
  useEffect(() => {
    if (isFrontend && currentPage > clientTotalPages) setCurrentPage(clientTotalPages);
  }, [clientTotalPages, currentPage, isFrontend]);

  // Debounce the backend search term.
  const searchChangeRef = React.useRef(serverPagination?.onSearchChange);
  useEffect(() => { searchChangeRef.current = serverPagination?.onSearchChange; }, [serverPagination?.onSearchChange]);

  useEffect(() => {
    if (!isFrontend && searchChangeRef.current) {
      const id = setTimeout(() => searchChangeRef.current?.(search.trim()), 500);
      return () => clearTimeout(id);
    }
  }, [search, isFrontend]);

  // ── Page navigation ────────────────────────────────────────
  const goPrev = () => {
    if (isFrontend) {
      setCurrentPage((p) => Math.max(1, p - 1));
    } else if (effectivePage > 1) {
      serverPagination!.onPageChange(effectivePage - 1);
    }
  };

  const goNext = () => {
    if (isFrontend) {
      setCurrentPage((p) => Math.min(clientTotalPages, p + 1));
    } else if (effectivePage < effectiveTotalPages) {
      serverPagination!.onPageChange(effectivePage + 1);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  function getValue(item: T, key: keyof T | string): unknown {
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = item;
      for (const k of keys) {
        if (value == null) return undefined;
        value = (value as Record<string, unknown>)[k];
      }
      return value;
    }
    return item[key as keyof T];
  }

  const expandedSet = useMemo(
    () => new Set(expandedRowKeys ?? []),
    [expandedRowKeys]
  );

  return (
    <Card className="border-border gap-0 p-0 mx-2">
      {(searchKey || title) && (
        <CardHeader className="border-b border-border pt-2 sm:pt-3 h-[70px] sm:h-15">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <CardTitle className="text-xs sm:text-lg font-semibold text-foreground">
              {title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {searchKey && <div className="relative flex-1 sm:flex-none min-w-[140px] sm:min-w-[200px]">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-sm sm:text-base pl-7 sm:pl-9 w-full sm:w-64 bg-white border-border text-xs sm:text-sm h-7 sm:h-10"
                />
              </div>}
              {onAdd && (
                <Button
                  onClick={onAdd}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-7 sm:h-8 sm:h-10 px-2 sm:px-4"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{addLabel}</span>
                  <span className="xs:hidden">{addLabel || "Add"}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {/* Mobile cards — uses mobileColumns so hideOnMobile works */}
        <div className={`sm:hidden overflow-y-auto ${height} space-y-2 p-2`}>
          {paginatedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {emptyMessage}
            </div>
          ) : (
            paginatedData.map((item) => {
              const isExpanded = !!renderExpandedRow && expandedSet.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg bg-white ${
                    onRowClick ? 'cursor-pointer hover:bg-secondary/40' : ''
                  }`}
                  onClick={() => onRowClick?.(item)}
                >
                  <div className="p-3 space-y-1.5">
                    {mobileColumns.map((column) => (
                      <div
                        key={String(column.key)}
                        className="flex items-start justify-between gap-2"
                      >
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                          {column.label}
                        </span>
                        <span className="text-xs text-right break-words min-w-0">
                          {column.render
                            ? column.render(item)
                            : String(getValue(item, column.key) ?? '')}
                        </span>
                      </div>
                    ))}
                  </div>
                  {isExpanded && renderExpandedRow && (
                    <div className="border-t bg-muted/20">
                      {renderExpandedRow(item)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table — full column set */}
        <div className={`hidden sm:block overflow-auto ${height}`}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-emerald-200 shadow-sm">
              <tr className="border-border">
                {columns?.map((column) => (
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
                        <span className="text-[10px] sm:text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
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
                paginatedData.map((item) => {
                  const isExpanded = !!renderExpandedRow && expandedSet.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`border-b border-border ${
                          onRowClick ? 'cursor-pointer hover:bg-secondary/100' : ''
                        }`}
                        onClick={() => onRowClick?.(item)}
                      >
                        {columns.map((column) => (
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
                      {isExpanded && renderExpandedRow && (
                        <tr className="border-b border-border bg-muted/20 hover:bg-muted/20">
                          <td colSpan={columns.length} className="p-0">
                            {renderExpandedRow(item)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Shared footer for both modes */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-t border-border gap-2 sm:gap-0">
          <p className="text-xs md:text-sm text-muted-foreground">
            Showing {rangeStart} to {rangeEnd} of {effectiveTotalCount} entries
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrev}
              disabled={effectivePage <= 1}
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <span className="text-xs md:text-sm text-foreground px-1 sm:px-2">
              Page {effectivePage} of {effectiveTotalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goNext}
              disabled={effectivePage >= effectiveTotalPages}
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
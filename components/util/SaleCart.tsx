import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CartColumn<T = any> {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface ReusableCartProps<T = any> {
  dataSource: T[];
  columns: CartColumn<T>[];
  onRemove?: (item: T, index: number) => void;
  onClear?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
  showRemove?: boolean;
  className?: string;
  height?: string;
  keyExtractor?: (item: T, index: number) => string | number;
}

const getAlignClass = (align?: string) => {
  switch (align) {
    case 'center': return 'text-center';
    case 'right': return 'text-right';
    default: return 'text-left';
  }
};

function ReusableCartInner<T extends Record<string, any>>({
  dataSource,
  columns,
  onRemove,
  onClear,
  loading = false,
  emptyMessage = 'No items in cart',
  emptySubMessage = 'Add items using the form above',
  showRemove = true,
  className = '',
  height = '',
  keyExtractor,
}: ReusableCartProps<T>) {
  const itemCount = dataSource.length;

  return (
    <Card className={`border-border m-0 ${className}`}>
      <CardHeader className="border-b border-border h-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingCart className="w-4 h-4 sm:w-5 h-5 text-primary mr-2" />
            <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </CardTitle>
          </div>
          {itemCount > 0 && onClear && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClear}
              disabled={loading}
              className='hidden sm:flex'
            >
              <Trash2 className="w-3 h-3 sm:w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={`p-0 m-0 -mt-4 ${height}`}>
        {itemCount === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{emptyMessage}</p>
            <p className="text-sm text-muted-foreground">{emptySubMessage}</p>
          </div>
        ) : (
          <div className="overflow-auto h-full" style={{ marginTop: "-10px" }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr className="border-b border-border">
                  {columns.map((col, idx) => (
                    <th
                      key={col.key as string || idx}
                      className={`p-1.5 sm:p-2 text-[11px] sm:text-xs lg:text-sm font-medium text-muted-foreground ${getAlignClass(col.align)}`}
                      style={{ width: col.width || 'auto' }}
                    >
                      {col.header}
                    </th>
                  ))}
                  {showRemove && onRemove && (
                    <th className="text-center p-1.5 sm:p-2 text-[11px] sm:text-xs lg:text-sm font-medium text-muted-foreground w-10 sm:w-12">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {dataSource.map((item, index) => {
                  const key = keyExtractor ? keyExtractor(item, index) : item.id ?? index;
                  return (
                    <tr key={key} className="border-b border-border hover:bg-muted/50 transition-colors">
                      {columns.map((col, colIndex) => (
                        <td
                          key={`${key}-${col.key as string || colIndex}`}
                          className={`p-1.5 sm:p-2 text-[11px] sm:text-xs lg:text-sm ${getAlignClass(col.align)}`}
                          style={{ width: col.width || 'auto' }}
                        >
                          {col.render ? col.render(item, index) : item[col.key as string]}
                        </td>
                      ))}
                      {showRemove && onRemove && (
                        <td className="p-1.5 sm:p-2 text-center">
                          <button
                            type="button"
                            onClick={() => onRemove(item, index)}
                            disabled={loading}
                            className="text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 cursor-pointer"
                            aria-label="Remove item"
                          >
                            <X className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const SaleCart = memo(ReusableCartInner) as typeof ReusableCartInner;
export default SaleCart;
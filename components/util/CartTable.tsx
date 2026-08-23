// import { SimpleTable } from '@/components/ui/simpleTable';
// import SimpleTable from '../ui/simpleTable';
import SimpleTable from '@/components/ui/simpleTable';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { CartItem } from '@/lib/types';
import { formatNumberWithCommas } from '@/helpers/formatStrings';
import { Dispatch, SetStateAction } from 'react';

export interface CartProps {
    dataSource: CartItem[];
    setDataSource : Dispatch<SetStateAction<CartItem[]>>
    onRemove?: (index: number) => void;
    headers?: (keyof CartItem)[];
    columnLabels?: Partial<Record<keyof CartItem, string>>;
    columnAlign?: Partial<Record<keyof CartItem, 'left' | 'center' | 'right'>>;
    columnWidths?: Partial<Record<keyof CartItem, string>>;
    renderers?: Partial<Record<keyof CartItem, (value: any, row: CartItem) => React.ReactNode>>;
    transactionActionType?: string;
    emptyMessage?: string;
    className?: string;
   
}

const CartTable = ({ 
    dataSource,
    onRemove,
    headers: customHeaders,
    columnLabels: customLabels,
    columnAlign: customAlign,
    columnWidths: customWidths,
    renderers: customRenderers,
    transactionActionType,
    emptyMessage = 'No items in cart',
    className = ''
}: CartProps) => {
    // Default headers
    const defaultHeaders: (keyof CartItem)[] = [
        'name', 
        'quantity', 
        'deliveredQuantity', 
        'receivingQuantity', 
        'remainingQuantity'
    ];

    // Default labels
    const isSale = transactionActionType === "SALE";
    const deliveredLabel = isSale ? "Delivered" : "Received";
    const receivingLabel = isSale ? "Delivering" : "Receiving";

    const defaultLabels: Partial<Record<keyof CartItem, string>> = {
        name: 'Item',
        quantity: 'Order Qty',
        deliveredQuantity: deliveredLabel,
        receivingQuantity: receivingLabel,
        remainingQuantity: 'Remaining'
    };

    // Default alignments
    const defaultAlign: Partial<Record<keyof CartItem, 'left' | 'center' | 'right'>> = {
        quantity: 'center',
        deliveredQuantity: 'center',
        receivingQuantity: 'center',
        remainingQuantity: 'center'
    };

    // Default widths
    const defaultWidths: Partial<Record<keyof CartItem, string>> = {
        name: '200px',
        quantity: '100px',
        deliveredQuantity: '100px',
        receivingQuantity: '100px',
        remainingQuantity: '100px'
    };

    // Default renderers
    const defaultRenderers: Partial<Record<keyof CartItem, (value: any, row: CartItem) => React.ReactNode>> = {
        name: (value, row) => (
            <div>
                <div className="text-xs sm:text-sm">{row.name}</div>
                <div className="text-[10px] sm:text-xs font-bold text-gray-500">{row.code}</div>
            </div>
        ),
        receivingQuantity: (value) => (
            <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                {formatNumberWithCommas(value?.toString() || '0')}
            </span>
        ),
        remainingQuantity: (value) => (
            <span style={{ color: "#2563eb", fontWeight: "600" }}>
                {formatNumberWithCommas(value?.toString() || '0')}
            </span>
        ),
        quantity: (value) => formatNumberWithCommas(value?.toString() || '0'),
        deliveredQuantity: (value) => formatNumberWithCommas(value?.toString() || '0'),
    };

    // Merge custom props with defaults
    const headers = customHeaders || defaultHeaders;
    const columnLabels = { ...defaultLabels, ...customLabels };
    const columnAlign = { ...defaultAlign, ...customAlign };
    const columnWidths = { ...defaultWidths, ...customWidths };
    const renderers = { ...defaultRenderers, ...customRenderers };

    return (
        <SimpleTable
            dataSource={dataSource}
            headers={headers}
            columnLabels={columnLabels}
            columnAlign={columnAlign}
            columnWidths={columnWidths}
            renderers={renderers}
            actionTemplate={(row, index) => (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove && onRemove(index)}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                </Button>
            )}
            emptyMessage={emptyMessage}
            className={className}
        />
    );
};

export default CartTable;
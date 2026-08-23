// components/ui/SimpleTable.tsx
import React from 'react';

export interface SimpleTableProps<T = any> {
    dataSource: T[];
    headers: (keyof T)[];
    renderers?: Partial<Record<keyof T, (value: any, row: T) => React.ReactNode>>; // Add this
    actionTemplate?: (row: T, index: number) => React.ReactNode;
    emptyMessage?: string;
    className?: string;
    rowClassName?: string | ((row: T, index: number) => string);
    columnLabels?: Record<string, string>;
    columnAlign?: Record<string, 'left' | 'center' | 'right'>;
    columnWidths?: Record<string, string>;
}

export function SimpleTable<T extends Record<string, any>>({
    dataSource,
    headers,
    renderers = {}, // Add this with default empty object
    actionTemplate,
    emptyMessage = 'No data available',
    className = '',
    rowClassName = '',
    columnLabels = {},
    columnAlign = {},
    columnWidths = {},
}: SimpleTableProps<T>) {
    const getHeaderLabel = (key: string) => {
        return columnLabels[key] || key.toString().replace(/([A-Z])/g, ' $1').trim();
    };

    const getCellValue = (row: T, key: keyof T) => {
        const value = row[key];
        
        // Use renderer if available
        if (renderers && renderers[key]) {
            return renderers[key](value, row);
        }
        
        if (value === null || value === undefined) {
            return '-';
        }
        return value;
    };

    const getRowClass = (row: T, index: number) => {
        if (typeof rowClassName === 'function') {
            return rowClassName(row, index);
        }
        return rowClassName;
    };

    return (
        <div className="w-full overflow-x-auto">
            <table className={`w-full min-w-[400px] ${className}`}>
                <thead>
                    <tr className="border-b border-border bg-gray-50">
                        {headers.map((key) => {
                            const keyStr = String(key);
                            return (
                                <th
                                    key={keyStr}
                                    className={`
                                        p-1 sm:p-2 text-xs font-medium text-muted-foreground
                                        ${columnAlign[keyStr] === 'center' ? 'text-center' : ''}
                                        ${columnAlign[keyStr] === 'right' ? 'text-right' : 'text-left'}
                                        ${columnWidths[keyStr] ? `w-[${columnWidths[keyStr]}]` : ''}
                                    `}
                                >
                                    {getHeaderLabel(keyStr)}
                                </th>
                            );
                        })}
                        {actionTemplate && (
                            <th className="p-1 sm:p-2 text-xs font-medium text-muted-foreground text-center">
                                Action
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {dataSource.length === 0 ? (
                        <tr>
                            <td 
                                colSpan={headers.length + (actionTemplate ? 1 : 0)} 
                                className="p-4 text-center text-sm text-muted-foreground"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        dataSource.map((row, index) => (
                            <tr
                                key={index}
                                className={`
                                    border-b border-border hover:bg-secondary/50
                                    ${getRowClass(row, index)}
                                `}
                            >
                                {headers.map((key) => {
                                    const keyStr = String(key);
                                    return (
                                        <td
                                            key={keyStr}
                                            className={`
                                                p-1 sm:p-2 text-xs sm:text-sm
                                                ${columnAlign[keyStr] === 'center' ? 'text-center' : ''}
                                                ${columnAlign[keyStr] === 'right' ? 'text-right' : 'text-left'}
                                            `}
                                        >
                                            {getCellValue(row, key)}
                                        </td>
                                    );
                                })}
                                {actionTemplate && (
                                    <td className="p-1 sm:p-2 text-center">
                                        {actionTemplate(row, index)}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default SimpleTable;
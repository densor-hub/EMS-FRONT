import { ItemStockLevelDTO } from "@/lib/types"
import { Loader2, AlertCircle } from "lucide-react"
import { formatNumberWithCommas } from "@/helpers/formatStrings"

interface StockLevelUiProps {
    stockLevel: ItemStockLevelDTO | null;
    loading?: boolean;
    itemId?: string;
    className?: string;
}

const StockLevelUi = ({ stockLevel, loading, itemId, className }: StockLevelUiProps) => {
    if (!itemId) {
        return (
            <div className="h-7 border-1 bg-gray-100 border-gray-300">
                <div className={className || `flex justify-center`} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-7 border-1 bg-gray-100 border-gray-300">
                <div className={className || `flex justify-center`}>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm mt-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking stock...
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (!stockLevel) {
        return (
            <div className="h-7 border-1 bg-gray-100 border-gray-300">
                <div className={className || `flex justify-center`}>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm mt-1">
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Stock info unavailable
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const { availableQuantity, actualQuantity, reorderLevel } = stockLevel;
    
    return (
        <div className="h-7 border-1 bg-gray-100 border-gray-300">
            <div className={className || `flex justify-center`}>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm mt-1">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2" style={{width: "100%"}}>
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-md">Available Qty:</span>
                            <span className={`font-bold text-md ${
                                availableQuantity === 0 ? 'text-destructive' :
                                availableQuantity < (reorderLevel || 5) ? 'text-yellow-600' :
                                'text-green-600'
                            }`}>
                                {formatNumberWithCommas(availableQuantity.toString())}
                            </span>
                            <span className="text-muted-foreground mx-1">|</span>
                            <span className="text-muted-foreground text-md">Actual Qty:</span>
                            <span className={`font-bold text-md ${
                                availableQuantity === 0 ? 'text-destructive' :
                                availableQuantity < (reorderLevel || 5) ? 'text-yellow-600' :
                                'text-green-600'
                            }`}>
                                {formatNumberWithCommas(actualQuantity.toString())}
                            </span>
                        </div>

                        {availableQuantity === 0 && (
                            <span className="text-destructive text-[10px] text-xs bg-destructive/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
                                <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Out of Stock!
                            </span>
                        )}
                        {availableQuantity > 0 && availableQuantity < 5 && (
                            <span className="text-yellow-600 text-[10px] text-xs bg-yellow-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
                                <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Low Stock!
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StockLevelUi;
import { TransactionItem, ItemStockLevelDTO } from "@/lib/types"
import { Loader2, AlertCircle } from "lucide-react"
import { formatNumberWithCommas } from "@/helpers/formatStrings"

interface iStockLevelUi {
    selectedItem : string,
    checkingStock : boolean,
    stockLevel : ItemStockLevelDTO | null
    className?: string
}

const StockLevelUi = (prop :  iStockLevelUi) => {
    return  <div className="h-7 border-1 bg-gray-100 border-gray-300" >
             <div className={prop?.className || `flex justify-center`}>
                    {/* Stock Level Display */}
                    {prop.selectedItem && (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm mt-1">
                        {prop.checkingStock ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking stock...
                          </span>
                        ) : prop?.stockLevel ? (
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2" style={{width:"100%"}}>
                            <div className="flex ">
                                <span className="text-muted-foreground text-md ">Available Qty:</span>
                                <span className={`font-bold  text-md ${
                                  prop.stockLevel.availableQuantity === 0 ? 'text-destructive' :
                                  prop.stockLevel.availableQuantity < prop?.stockLevel?.reorderLevel ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {formatNumberWithCommas(prop?.stockLevel.availableQuantity.toString())}
                                </span>
                              <span style={{visibility:"hidden"}}>---</span>
                              <span className="text-muted-foreground text-md">Actual Qty:</span>
                              <span className={`font-bold text-md  ${
                                prop?.stockLevel.availableQuantity === 0 ? 'text-destructive' :
                                prop?.stockLevel.availableQuantity < prop?.stockLevel?.reorderLevel ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {/* {stockLevel.actualQuantity}  */}{formatNumberWithCommas(prop?.stockLevel.actualQuantity.toString())}
                              </span>
                            </div>


                            {prop?.stockLevel.availableQuantity === 0 && (
                              <span className="text-destructive text-[10px] text-xs bg-destructive/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
                                <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Out of Stock!
                              </span>
                            )}
                            {prop?.stockLevel.availableQuantity > 0 && prop?.stockLevel.availableQuantity < 5 && (
                              <span className="text-yellow-600 text-[10px] text-xs bg-yellow-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
                                <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Low Stock!
                              </span>
                            )}
                            {/* {stockLevel.reorderLevel > 0 && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                Reorder at: {stockLevel.reorderLevel}
                              </span>
                            )} */}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Stock info unavailable</span>
                        )}
                      </div>
                    )}
                  </div>
    </div>
}

export default StockLevelUi
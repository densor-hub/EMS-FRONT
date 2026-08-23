import { useCallback } from "react"
import { CartProps } from "./CartTable"
import CartTable from "./CartTable"
import { ShoppingCart } from "lucide-react"
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card"

const CartUi = (props: CartProps) => {

     const totalDelivering = props?.dataSource?.reduce((sum, c) => sum + c.receivingQuantity, 0);

       const removeFromCart = useCallback((index: number) => {
         props?.setDataSource(prev => prev.filter((_, i) => i !== index));
       }, []);
     
 return   <Card className="p-1 border-border">
               <CardHeader className="border-b border-border h-4  m-0 mb-[-20px]" >
                 <div className="flex items-center justify-between" >
                   <div className="flex items-center">
                     <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                     <CardTitle className="text-sm sm:text-lg font-semibold ml-2">
                       {props?.dataSource?.length} {props?.dataSource?.length === 1 ? "item" : "items"}
                     </CardTitle>
                   </div>
                   {props?.dataSource?.length > 0 && (
                     <span className="text-xs sm:text-sm text-gray-500">
                       Total: {totalDelivering} units
                     </span>
                   )}
                 </div>
               </CardHeader>
               <CardContent className="p-0 sm:h-[calc(100vh-420px)] overflow-auto m-0 "  >
                  <CartTable
                     dataSource={props?.dataSource}
                     onRemove={removeFromCart}
                     transactionActionType={props?.transactionActionType}
                     // Optional customizations
                     headers={props?.headers} //['name', 'quantity', 'receivingQuantity', 'remainingQuantity']
                     columnLabels={props?.columnLabels}
                     renderers={props?.renderers}
                    //  {
                    //      name: (value, row) => (
                    //          <div className="font-semibold">
                    //              {row.name} - {row.code}
                    //          </div>
                    //      )
                    //  }
                     className="my-custom-table"
                     emptyMessage="Your cart is empty. Please add items."
                     setDataSource={props?.setDataSource}
                 />
               </CardContent>
             </Card>
}


export default CartUi;
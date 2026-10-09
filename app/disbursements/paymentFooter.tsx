import { Transaction } from "@/lib/types"
import { formatNumberWithCommas, removeCommasFromNumbers } from "@/helpers/formatStrings"

interface PaymentFooterProp {
  selectedTransaction : Partial<Transaction>
}
const PaymentsFooter = ({selectedTransaction} : PaymentFooterProp) => {
  return <>
   {/* Footer Total */}
          <div className="total-section" style={{fontSize:"small", marginTop:'10px'}}>
             <div className="flex justify-between " style={{textAlign:"right", paddingLeft:"10px"}}>
              <span>Total Cost: </span>
              <span>{" "}</span>
              <span className="" style={{fontWeight:"bold"}}>
                {formatNumberWithCommas(
                  selectedTransaction?.totalAmount?.toFixed(2) || "0"
                )}
              </span>
            </div>

            <div className="flex justify-between " style={{textAlign:"right", paddingLeft:"10px"}}>
              <span>Total Payments: </span>
              <span>{" "}</span>
              <span className="" style={{fontWeight:"bold"}}>
                {formatNumberWithCommas(
                  selectedTransaction?.paidAmount?.toFixed(2) || "0"
                )}
              </span>
            </div>

            <div className="flex justify-between " style={{textAlign:"right", paddingLeft:"10px"}}>
              <span>{(selectedTransaction?.paidAmount  || 0)  >= (selectedTransaction?.totalAmount || 0) ? "Balance" :"Debt"}: </span>
              <span>{" "}</span>
              <b className="" style={removeCommasFromNumbers(selectedTransaction?.paidAmount?.toString() || "") > removeCommasFromNumbers(selectedTransaction?.totalAmount?.toString() || "")  ? {color:"blue"} : 
                                      removeCommasFromNumbers(selectedTransaction?.paidAmount?.toString() || "") < removeCommasFromNumbers(selectedTransaction?.totalAmount?.toString() || "") ? {color:"red"} : {color:"green"}}>
                {formatNumberWithCommas(((selectedTransaction?.totalAmount || 0) - (selectedTransaction?.paidAmount || 0))?.toFixed(2))}
              </b>
            </div>
          </div></>
} 

export default PaymentsFooter

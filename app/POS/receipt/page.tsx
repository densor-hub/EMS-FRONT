// app/transactions/delivery/page.tsx
'use client'

import React, {useState} from 'react'
import QRScanner from '@/components/util/QRScanner'
import { Header } from '@/components/dashboard/header'
import { Transaction } from '@/lib/types'
import POSReceipt, { POSReceiptProps } from '@/components/util/POSReceipt'
import { useAuth } from '@/lib/auth-context'
import axiosInstance from '@/lib/customAxios'
import { toastErrors, toastSuccess } from '@/helpers/formatStrings'
import { useToaster } from '@/components/util/CustomToast'


export default function DeliveryPage() {
    const {user, selectedShop} = useAuth()
    const toast = useToaster()
    const sessionShop = sessionStorage.getItem("selectedShop");
  const [showScanner, setShowScanner] = React.useState(false)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [receiptData, setReceiptData] = useState<POSReceiptProps | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [qrSacannerError, setQrSacannerError] = useState<string | null>(null)

  // Fetch transaction by QR code value
    const fetchTransaction = async (qrCode: string) => {
      setIsLoading(true)
      setQrSacannerError(null)
      setTransaction(null)
  
      try {
        const response = await axiosInstance.get(`/Sales/Generate-Receipt/${qrCode}`)
        
        if (response.data) {
          const transactionData = response.data as Transaction
          setTransaction(transactionData)
          toastSuccess(toast, `✅ Transaction found: ${transactionData.transactionId || transactionData.id || transaction?.transactionCode}`)
          
           setReceiptData({
              qrCode : "", 
              transactionNumber : transactionData?.transactionCode || "", 
              showQRCode: false, 
              // amount : transactionData?.totalAmount, 
              customerName: transactionData?.customerName, 
              date: transactionData?.transactionDate, 
              merchantName: user?.locations?.find(x=> x.id == (selectedShop || sessionShop))?.name,
              items: transactionData?.items?.map((x)=> {
                      return {
                            name : x.itemName || x.name,
                            quantity : x.quantity,
                            price : x.unitPrice,
                            total : x.quantity * x.unitPrice
                            //code : x.code
                      }
                  })
            });
  
          // if (onTransactionFound) {
          //   onTransactionFound(transactionData)
          // }
            
        } else {
          setQrSacannerError('Transaction not found')
          toastErrors(toast, 'No transaction found with this QR code.', 'Not Found')
        }
      } catch (error: any) {
        console.error('Error fetching transaction:', error)
        setQrSacannerError(error?.response?.data?.message 
            ? error?.response?.data?.message 
            : typeof(error?.response?.data) === 'string' 
              ? error?.response?.data 
              : 'Failed to fetch transaction')
        
        toastErrors(toast, "There was a technical challenge, please try again later")
      
      } finally {
        setIsLoading(false)
      }
    }

  return (
    <div className="p-4 h-full">
      <Header title='Generate Receipt' description='POS Receipt'/>
     
     <div className='flex justify-center align-center' style={{height:"80%"}}>
         <button 
          onClick={() => setShowScanner(true)}
          className="p-5 bg-blue-600 text-white rounded-md hover:bg-blue-700 m-auto"
          >
           Click here to scan QR Code
          </button>

          { <QRScanner
            visible={showScanner}
            onClose={() => setShowScanner(false)}
            isLoading={isLoading}
            fetchTransaction={fetchTransaction}
            transaction={transaction}
            error={qrSacannerError}
            setError={setQrSacannerError}
            //  onTransactionFound={handleTransactionFound}
          />}

            {/* Transaction Result */}
          {transaction && receiptData && (<div className=" fixed inset-0 z-100 top-0 left-0 right-0 min-h-screen bg-gray-100 p-4 flex justify-center">
            <POSReceipt
              data={receiptData}
              setData={setReceiptData}
            />
            </div>
            
          )}

     </div>
    </div>
  )
}
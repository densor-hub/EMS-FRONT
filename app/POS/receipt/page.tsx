// app/transactions/delivery/page.tsx
'use client'

import React from 'react'
import QRScanner from '@/components/util/QRScanner'

export default function DeliveryPage() {
  const [showScanner, setShowScanner] = React.useState(false)
  const [foundTransaction, setFoundTransaction] = React.useState(null)

  const handleTransactionFound = (transaction: any) => {
    setFoundTransaction(transaction)
    console.log('Transaction found:', transaction)
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Delivery Transactions</h1>
      
      <button 
        onClick={() => setShowScanner(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Scan QR Code
      </button>

      <QRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onTransactionFound={handleTransactionFound}
      />

      {foundTransaction && (
        <div className="mt-4 p-4 bg-green-100 rounded-lg">
          <pre className="text-sm">
            {JSON.stringify(foundTransaction, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
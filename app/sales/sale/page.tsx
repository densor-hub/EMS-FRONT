"use client";

import { Suspense, useState } from "react";
import { Header } from '@/components/dashboard/header';
import { 
  Transaction,
} from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import SaleTransactionUi from "@/components/util/SaleTransactionUi";



export default function SalePage() {
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
 
 

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Suspense fallback>

      <div className=" min-h-screen w-[100%] ">
      <Header 
          title="Sale" 
          description="Sell items to customers" 
        />

      <div className="relative">
          {/* Using your Modal component */}
          <div className="absolute top-0 w-full" style={{textAlign:'center'}}>
              <div className="w-full" >
                <SaleTransactionUi 
                    instantSale={true}
                    setOpen={setModalOpen} 
                    reloadSetterFunction = {setPurchases} 
                    reloadUrl=""
                   // reloadUrl={`/Sales/LocationId=${selectedShop}`}
                    submitUrl="/Sales/General"
                    transactionActionType="SALE"
                    
                  />
              </div>
          </div>
  </div>

    </div>
    </Suspense>
  );
}




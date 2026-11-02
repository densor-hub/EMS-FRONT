"use client";

import { Suspense, useEffect, useState } from "react";
import { Header } from '@/components/dashboard/header';
import { 
  Transaction,
} from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import SaleTransactionUi from "@/components/util/SaleTransactionUi";
import { config } from "@/components/util/AppConfig";
import { readCachedSettings } from "@/helpers/formatStrings";


export default function SalePage() {
  const [modalOpen, setModalOpen] = useState<boolean>(false);

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
                    // reloadSetterFunction = {setPurchases} 
                    // reloadUrl=""
                   // reloadUrl={`/Sales/LocationId=${selectedShop}`}
                    submitUrl="/Sales/General"
                    transactionActionType={config.transactionTypes.SALE}
                    allowItemSelection={readCachedSettings()?.saleToDeliveryMode}
                  />
              </div>
          </div>
  </div>

    </div>
    </Suspense>
  );
}




"use client";

import { Header } from '@/components/dashboard/header';

import StockVerificationUi from "@/components/util/StockVerificationUi";

export default function StockVerificationPage() {
 
  return (
    <div className=" min-h-screen w-[100%] ">
      <Header 
          title="Stock Verification" 
          description="Verify submitted stocks" 
        />

      <div className="relative">
          {/* Using your Modal component */}
          <div className="absolute top-0 w-full" style={{textAlign:'center'}}>
              <div className="w-full" >
                <StockVerificationUi 
                    // reloadSetterFunction = {setPurchases} 
                    // reloadUrl={`/Sales/LocationId=${selectedShop}`}
                    // submitUrl="/Sales"
                  
                  />
              </div>
          </div>
  </div>

  </div>
  );
}




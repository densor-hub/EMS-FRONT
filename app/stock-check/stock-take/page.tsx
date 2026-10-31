"use client";

import { Header } from '@/components/dashboard/header';
// import { useToast } from "@/components/ui/use-toast";
import StockTakeUI from "@/components/util/StockTakeUi";

export default function StockTakePage() {

  return (
    <div className=" min-h-screen w-[100%] ">
      <Header 
          title="Stock Take" 
          description="Sumbit stock of items" 
        />

      <div className="relative">
          {/* Using your Modal component */}
          <div className="absolute top-0 w-full" style={{textAlign:'center'}}>
              <div className="w-full" >
                <StockTakeUI 
                    // instantSale={true}
                    // setOpen={setModalOpen} 
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




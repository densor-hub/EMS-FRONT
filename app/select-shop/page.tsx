'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
// import { Modal } from '@/components/dashboard/modal';


export default function SelectCompany() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("")
  const {user, setSelectedShop} = useAuth();

   useEffect(() => {
    console.log(selected)
      if (selected) {
        setSelectedShop(selected)
        sessionStorage.setItem("selectedShop", selected)
        if (window.location.pathname=== "/select-shop") router.push("/dashboard")
      }
   }, [selected])

  return (
   
    <div>
      {/* <>Testing Mike</> */}
      <Header title="Select Shop" />

        {/* Filters */}
        <div className="flex items-center gap-4" style={{height:"Calc(100vh - 100px)"}}>
          <div className="w-ful" style={{margin: "0 auto"}}>
            <div>Hi {user?.firstName}, {(user?.locations?.length ?? 0) > 0?  "Select a shop to continue" : "Setup shops to continue"}</div>
            {(user?.locations?.length ?? 0) > 0? <div style={{ textAlign:'center', display:"flex", justifyContent: 'center'}}>
              <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="bg-white border-border">
                <SelectValue placeholder="Select a shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {user?.locations?.map(shop => (
                  <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div> : <>
                <Button onClick={(e) => {
                   e.preventDefault();
                   router.push('/setup/shops')
                }}>
                  Click here to set up shops
                </Button>
            </>}
          </div>
          
        </div>
       
      </div>

    // </Modal>

   
  );
}

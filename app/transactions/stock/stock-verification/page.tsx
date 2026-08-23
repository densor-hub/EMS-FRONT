"use client";

import { useState, useEffect, useRef, SetStateAction, Dispatch } from "react";
import { Wallet, Plus, DollarSign, Package, User, Calendar, Edit, Trash2, List, DollarSignIcon } from "lucide-react";
import SaleComplete from "@/components/util/SaleComplete";
import { Header } from '@/components/dashboard/header';
import { 
  Customer, 
  Item,
  Supplier,
  Transaction,
  TransactionItem, 
  // Deposit, 
  // DepositFormData 
} from "@/lib/types";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import axiosInstance from "@/lib/customAxios";

import { alphaNumericDate, formatNumberWithCommas, removeCommasFromNumbers, Sum } from "@/helpers/formatStrings";

import { useToast } from "@/hooks/use-toast";
// import { useToast } from "@/components/ui/use-toast";
// import StockTakeUI from "@/components/util/StockTakeUi";
import StockVerificationUi from "@/components/util/StockVerificationUi";

interface SaleCompleteProps {
  transaction: Transaction;
  onSuccess?: () => void;
}



export default function SalePage() {
  const {toast} = useToast()
  const {selectedShop, user} = useAuth()
  // const [items, setItems] = useState<Item[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  // const [itemsModalOpen, setItemsModalOpen] = useState<boolean>(false);
  // const [paymentsModalOpen, setPayemntsModalOpen] = useState<boolean>(false);
  // const [showAddPayment, setShowAddPayment] = useState<boolean>(false);
 
  const [amountPaid, setAmountPaid] = useState("")
  const [date, setDate] = useState('')
  
const printContentRef = useRef(null);
const isLoadingRef = useRef(false);

const loadData = async (): Promise<void> => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    try {
        const purchasess = await axiosInstance.get(`/purchases?LocationId=${selectedShop || sessionStorage.getItem("selectedShop")}`)
        setPurchases(purchasess?.data);
    } catch (error) {
        console.error("Error loading data:", error);
    } finally {
        setLoading(false);
        isLoadingRef.current = false;
    }
};


  useEffect(() => {
    loadData();
  }, []);

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




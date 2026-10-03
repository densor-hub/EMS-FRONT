// Core Types for Enterprise Management System

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  createdAt: string;
}

export interface Shop {
  id: string;
  code : string;
  companyId: string | undefined;
  name: string;
  address : "",
  phone: string;
  managers?: IdAndName[];
  status: boolean;
  createdAt: string;
  locationType: number;
  email: string
}

export interface Role {
  id: string;
  companyId: string;
  name: string;
  permissions: string[];
  description: string;
  createdAt: string;
  status : boolean;
}

export interface Profile{
  
}

export interface AppRoute{
  id : string ,
  level : number,
  parentId : string,
  path: string ,
  title : string ,
  children : AppRoute []
}

export interface Employee {
  id: string;
  companyId: string;
  shopId: string;
  roleId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  salary: number;
  hireDate: string;
  isActive: boolean;
  isAppUser: boolean;
  selectedShops : string [];
  locations : string  [];
  status : string;
}

export interface Customer {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  code  : string;
  phone: string;
  address: string;
  creditLimit: number;
  balance: number;
  deposits: number;
  reservedItems: ReservedItem[];
  createdAt: string;
  nationalId : string;
}

export interface ReservedItem {
  itemId: string;
  quantity: number;
  reservedAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  supplierCompanyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
  createdAt: string;
  firstName : string;
  lastName : string ;
  locations : string [],
}

export interface Item {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description: string;
  category: string;
 // costPrice: number;
  sellingPrice: number;
  unitOfMeasure: string;
  unitOfMeasureName: string;
  reorderLevel: number;
  status: boolean;
  createdAt: string;
  size?: string,
  type?:string,
  locked?: boolean,
  locations : string [],
  quanityInUnit : number
}

export interface CartItem {
   //genearl props
    quantity: number;
    price: number;
    id: string;
    name: string;
    code?: string;

    //delivery 
    receivingQuantity?: number;
    deliveredQuantity?: number;
    remainingQuantity?: number;
    //stock
    totalPieces?:number;
    availableQuantity?: number;
    stockLevel? : ItemStockLevelDTO | undefined
    unitOfMeasureName?: string,
    unitOfMeasure?: string,
    quanityInUnit? : number,
    batchId?: string
}

export interface CouponResponse {
  id: string;
  code: string;
  amount: number;
  used: boolean;
  expiryDate: string;
}

export interface StockItem {
  id: string;
  itemId: string;
  shopId: string;
  quantity: number;
  lastUpdated: string;
}

export interface ItemStockLevelDTO
{
  name :string;
  code :string;
  reorderLevel : number;
  availableQuantity : number;
  actualQuantity :number;
}

export interface TransactionPayment {
  paymentDate : string,
  amount : number,
  id : string,
  paymentMethod: number
}


export interface IdAndName {
  name: string;
  id: number | string;
}



export interface Transaction {
  id: string;
  transactionId?:string;
  companyId?: string;
  transactionCode?: string,
  locationId?: string | null;
  type: 'sale' | 'credit_sale' | 'purchase' | 'credit_purchase' | 'deposit' | 'payment';
  businessPartnerId?: string;
  customerName?: string;
  customerId?: string;
  supplierId?: string;
  supplierName?: string;
  items: TransactionItem[];
  payments?: TransactionPayment[];
  totalAmount: number;
  paidAmount: number;
  status?: string;
  statusNumber? : number;
  notes?: string;
  createdAt?: string;
  discountCode?: string;
  transactionDate: string; 
  initiatedBy?: string;
  approvedBy? : string;
}

export interface TransactionItem {
  itemId: string;
  id: string;
  itemName : string,
  name : string,
  quantity: number;
  unitPrice: number;
  total: number;
  itemsDelivered :TransactionItemsDelivered[];
  itemsReceived :TransactionItemsDelivered[];
  code : string;
  costPrice: number;
  availableQuantity?: number;
  actualQuantity?: number;
}

export interface TransactionItemsDelivered {
  deliveryId : string,
  quantity : number;
  deliveryDate: string;
  itemReversals:TransactionItemReversals[];
  name?: string;
  status? : string
}

export interface TransactionItemReversals {
  reversalId : string,
  quantity : number,
  reversalDate : string,
}

export interface DropDownData {
  id : string,
  name : string,
  code : string 
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  locations : DropDownData [],
  routes : DropDownData []
}

export interface AuthState {
  user: User | null | undefined;
  company: Company | null | undefined;
  isAuthenticated: boolean;
}

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalItems: number;
  lowStockItems: number;
  pendingCredits: number;
  totalEmployees: number;
}

// Types
export interface StockTake_UI {
  setOpen: (isOpen: boolean) => void;
  reloadUrl?: string;
  reloadSetterFunction?: (data: any) => void;
}

export interface StockTakeItem {
  itemId: string;
  quantity: number;
  item?: Item;
  totalPieces:number
}

export interface StockTakePayload {
  locationId: string;
  conductedBy: string | undefined;
  stockTakingDate: string;
  comment: string;
  createdBy: string;
  items: StockTakeItem[];
}


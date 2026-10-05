import axiosInstance, { logout } from '../lib/customAxios';
import { useToaster } from '@/components/util/CustomToast';

import type {
  Company,
  Shop,
  Role,
  Employee,
  Customer,
  Supplier,
  Item,
  StockItem,
  Transaction,
  User,
  DashboardStats,
} from './types';

import { AxiosError, AxiosResponse } from 'axios';

// Create axios instance for future API integration
// const api = axios.create({
//   baseURL: '/api',
//   timeout: 10000,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Storage keys
const STORAGE_KEYS = {
  SHOPS: 'enterprise_shops',
  ROLES: 'enterprise_roles',
  EMPLOYEES: 'enterprise_employees',
  CUSTOMERS: 'enterprise_customers',
  SUPPLIERS: 'enterprise_suppliers',
  ITEMS: 'enterprise_items',
  STOCK: 'enterprise_stock',
  TRANSACTIONS: 'enterprise_transactions',
};

// Helper to get data from memory (simulating database)
// let shops = [...mockShops];
// let roles = [...mockRoles];
// let employees = [...mockEmployees];
// let customers = [...mockCustomers];
// let suppliers = [...mockSuppliers];
// let items = [...mockItems];
// let stockItems = [...mockStockItems];
// let transactions = [...mockTransactions];

// Auth Service
// lib/api-service.ts



export const authService = {
  login: async (email: string, password: string): Promise<any> => {
     try{
        const response = await axiosInstance.post('/auth/login', { email, password });
        // setClientAuthState();
        //console.log(response)
        return response;
     } catch(error : any){
     // console.log(error.response)
      //  toast.warning({
      //    title: error?.response?.data?.message,
      //    description: error?.message
      // })

       return console.log(error?.response?.data?.message)
     }
  },

  signup: async (company: Partial<Company>, adminInfo: Partial<User> & { password: string, confirmPassword : string }): Promise<{ status : number } | void> => {
     try{
      const response = await axiosInstance.post('/auth/register', { company, adminInfo : {...adminInfo, fullname : `${adminInfo.firstName} ${adminInfo.lastName}`} });
      
      // toast.success({
      //     title: "Account created successfully",
      //     description: "Please log in to continue",
      //   })

      return {status : response.status};
     } catch(error : any){
      //  toast.warning({
      //   title: error?.response?.data?.message,
      //   description: error?.message,
      // })

       return console.log(error?.response?.data?.message)
     }
  },

  logout: async () => {
   // clearClientAuthState()
    sessionStorage.clear()
    await logout();
    
  }
};



// Shop Service


// Transaction Service



// Deposit type for the deposits feature
interface Deposit {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  itemId?: string;
  itemName?: string;
  intendedQuantity?: number;
  notes?: string;
  status: 'active' | 'used' | 'refunded';
  createdAt: string;
}

let deposits: Deposit[] = [];

// Combined API Service for easy import
export const apiService = {
  // Auth
  login: authService.login,
  signup: authService.signup,
  logout: authService.logout,


  // Deposits
  getDeposits: async (): Promise<Deposit[]> => {
    await delay(300);
    return deposits;
  },
  createDeposit: async (data: Omit<Deposit, 'id'>): Promise<Deposit> => {
    await delay(300);
    const newDeposit: Deposit = {
      ...data,
      id: `dep-${Date.now()}`,
    };
    deposits.push(newDeposit);
    return newDeposit;
  },
};

export default authService;

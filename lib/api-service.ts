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
import {
  mockCompany,
  mockUser,
  mockShops,
  mockRoles,
  mockEmployees,
  mockCustomers,
  mockSuppliers,
  mockItems,
  mockStockItems,
  mockTransactions,
  mockDashboardStats,
} from './mock-data';
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
let shops = [...mockShops];
let roles = [...mockRoles];
let employees = [...mockEmployees];
let customers = [...mockCustomers];
let suppliers = [...mockSuppliers];
let items = [...mockItems];
let stockItems = [...mockStockItems];
let transactions = [...mockTransactions];

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
export const shopService = {
  async getAll(): Promise<Shop[]> {
    await delay(300);
    return shops;
  },

  async getById(id: string): Promise<Shop | undefined> {
    await delay(200);
    return shops.find(s => s.id === id);
  },

  async create(data: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> {
    await delay(300);
    const newShop: Shop = {
      ...data,
      id: `shop-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    shops.push(newShop);
    return newShop;
  },

  async update(id: string, data: Partial<Shop>): Promise<Shop> {
    await delay(300);
    const index = shops.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Shop not found');
    shops[index] = { ...shops[index], ...data };
    return shops[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    shops = shops.filter(s => s.id !== id);
  },
};

// Role Service
export const roleService = {
  async getAll(): Promise<Role[]> {
    await delay(300);
    return roles;
  },

  async create(data: Omit<Role, 'id' | 'createdAt'>): Promise<Role> {
    await delay(300);
    const newRole: Role = {
      ...data,
      id: `role-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    roles.push(newRole);
    return newRole;
  },

  async update(id: string, data: Partial<Role>): Promise<Role> {
    await delay(300);
    const index = roles.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Role not found');
    roles[index] = { ...roles[index], ...data };
    return roles[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    roles = roles.filter(r => r.id !== id);
  },
};

// Employee Service
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    await delay(300);
    return employees;
  },

  async create(data: Omit<Employee, 'id'>): Promise<Employee> {
    await delay(300);
    const newEmployee: Employee = {
      ...data,
      id: `emp-${Date.now()}`,
    };
    employees.push(newEmployee);
    return newEmployee;
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    await delay(300);
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    employees[index] = { ...employees[index], ...data };
    return employees[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    employees = employees.filter(e => e.id !== id);
  },
};

// Customer Service
export const customerService = {
  async getAll(): Promise<Customer[]> {
    await delay(300);
    return customers;
  },

  async create(data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    await delay(300);
    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    customers.push(newCustomer);
    return newCustomer;
  },

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    await delay(300);
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    customers[index] = { ...customers[index], ...data };
    return customers[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    customers = customers.filter(c => c.id !== id);
  },

  async addDeposit(id: string, amount: number, reservedItems?: { itemId: string; quantity: number }[]): Promise<Customer> {
    await delay(300);
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    customers[index].deposits += amount;
    if (reservedItems) {
      customers[index].reservedItems.push(
        ...reservedItems.map(ri => ({
          ...ri,
          reservedAt: new Date().toISOString().split('T')[0],
        }))
      );
    }
    return customers[index];
  },
};

// Supplier Service
export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    await delay(300);
    return suppliers;
  },

  async create(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    await delay(300);
    const newSupplier: Supplier = {
      ...data,
      id: `supp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    suppliers.push(newSupplier);
    return newSupplier;
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    await delay(300);
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Supplier not found');
    suppliers[index] = { ...suppliers[index], ...data };
    return suppliers[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    suppliers = suppliers.filter(s => s.id !== id);
  },
};

// Item Service
export const itemService = {
  async getAll(): Promise<Item[]> {
    await delay(300);
    return items;
  },

  async create(data: Omit<Item, 'id' | 'createdAt'>): Promise<Item> {
    await delay(300);
    const newItem: Item = {
      ...data,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    items.push(newItem);
    return newItem;
  },

  async update(id: string, data: Partial<Item>): Promise<Item> {
    await delay(300);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');
    items[index] = { ...items[index], ...data };
    return items[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    items = items.filter(i => i.id !== id);
  },
};

// Stock Service
export const stockService = {
  async getAll(): Promise<StockItem[]> {
    await delay(300);
    return stockItems;
  },

  async getByShop(shopId: string): Promise<StockItem[]> {
    await delay(300);
    return stockItems.filter(s => s.shopId === shopId);
  },

  async updateStock(itemId: string, shopId: string, quantity: number): Promise<StockItem> {
    await delay(300);
    const index = stockItems.findIndex(s => s.itemId === itemId && s.shopId === shopId);
    if (index === -1) {
      const newStock: StockItem = {
        id: `stk-${Date.now()}`,
        itemId,
        shopId,
        quantity,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      stockItems.push(newStock);
      return newStock;
    }
    stockItems[index].quantity = quantity;
    stockItems[index].lastUpdated = new Date().toISOString().split('T')[0];
    return stockItems[index];
  },

  async getLowStock(threshold?: number): Promise<Array<StockItem & { item: Item }>> {
    await delay(300);
    const result: Array<StockItem & { item: Item }> = [];
    for (const stock of stockItems) {
      const item = items.find(i => i.id === stock.itemId);
      if (item && stock.quantity <= (threshold || item.reorderLevel)) {
        result.push({ ...stock, item });
      }
    }
    return result;
  },
};

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

  // Shops
  getShops: shopService.getAll,
  getShop: shopService.getById,
  createShop: shopService.create,
  updateShop: shopService.update,
  deleteShop: shopService.delete,

  // Roles
  getRoles: roleService.getAll,
  createRole: roleService.create,
  updateRole: roleService.update,
  deleteRole: roleService.delete,

  // Employees
  getEmployees: employeeService.getAll,
  createEmployee: employeeService.create,
  updateEmployee: employeeService.update,
  deleteEmployee: employeeService.delete,

  // Customers
  getCustomers: customerService.getAll,
  createCustomer: customerService.create,
  updateCustomer: customerService.update,
  deleteCustomer: customerService.delete,

  // Suppliers
  getSuppliers: supplierService.getAll,
  createSupplier: supplierService.create,
  updateSupplier: supplierService.update,
  deleteSupplier: supplierService.delete,

  // Items
  getItems: itemService.getAll,
  createItem: itemService.create,
  updateItem: itemService.update,
  deleteItem: itemService.delete,

  // Stock
  getStockItems: stockService.getAll,
  getStockByShop: stockService.getByShop,
  updateStock: stockService.updateStock,
  getLowStock: stockService.getLowStock,

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

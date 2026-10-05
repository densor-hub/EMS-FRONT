// lib/customAxios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Company, User } from './types';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7214'

let isRefreshing = false;

// Store auth state
let accessToken: string | null = null;
let accessTokenExpiry: Date | null = null;
let currentUser: Partial<User> = {};
let currentCompany: Partial<Company> = {};

// Track initialization
let initialAuthCheckDone = false;
let initialAuthCheckPromise: Promise<boolean> | null = null;
let initialAuthCheckResult: boolean | null = null; // Cache the result

// Store callbacks for React state updates
let userStateSetter: ((user: Partial<User>) => void) | null = null;
let companyStateSetter: ((company: Partial<Company>) => void) | null = null;


const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Register React state setters
export const registerAuthSetters = (
  setUser: (user: Partial<User>) => void,
  setCompany: (company: Partial<Company>) => void
) => {
  userStateSetter = setUser;
  companyStateSetter = setCompany;
  
  // Immediately sync existing data if available
  if (Object.keys(currentUser).length > 0) {
    setUser(currentUser);
  }
  if (Object.keys(currentCompany).length > 0) {
    setCompany(currentCompany);
  }
};

// Update auth state everywhere
const updateAuthState = (user?: Partial<User>, company?: Partial<Company>) => {
  if (user && Object.keys(user).length > 0) {
    currentUser = { ...currentUser, ...user };
    if (userStateSetter) {
      userStateSetter(currentUser);
    }
  }
  
  if (company && Object.keys(company).length > 0) {
    currentCompany = { ...currentCompany, ...company };
    if (companyStateSetter) {
      companyStateSetter(currentCompany);
    }
  }
};

// Clear auth state - ONLY call this on explicit logout or auth failure
export const clearAuthState = () => {
  console.log('Clearing auth state');
  currentUser = {};
  currentCompany = {};
  accessToken = null;
  accessTokenExpiry = null;
  initialAuthCheckDone = false;
  initialAuthCheckPromise = null;
  initialAuthCheckResult = null;
  sessionStorage.clear();
  localStorage.clear();
  
  if (userStateSetter) {
    userStateSetter({});
  }
  if (companyStateSetter) {
    companyStateSetter({});
  }
  
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('isAuthenticated');
  }
};

// Perform initial auth check - ONLY call this once
export const performInitialAuthCheck = async (
  setUser?: React.Dispatch<React.SetStateAction<Partial<User>>>,
  setCompany?: React.Dispatch<React.SetStateAction<Partial<Company>>>
): Promise<boolean> => {
  // Register setters if provided
  if (setUser && setCompany) {
    registerAuthSetters(setUser, setCompany);
  }

  // Return cached result if already completed successfully
  if (initialAuthCheckResult) {
   // return initialAuthCheckResult;
  }

  // Return existing promise if in progress
  if (initialAuthCheckPromise) {
    return initialAuthCheckPromise;
  }

  // Create new auth check promise
  initialAuthCheckPromise = (async () => {
    try {
      const response = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      // Parse user data
      const fullName = response?.data?.fullName || '';
      const nameParts = fullName.split(' ');
      const userData: Partial<User> = {
        lastName: nameParts[nameParts.length - 1] || '',
        firstName: nameParts[0] || '',
        id: response?.data?.id,
        companyId: response?.data?.company?.id,
        routes: response?.data?.routes || [],
        locations: response?.data?.locations || []
      };
      
      const companyData: Partial<Company> = {
        id: response?.data?.company?.id,
        name: response?.data?.company?.name
      };

      // Store token
      if (response.data.accessToken) {
        accessToken = response.data.accessToken;
        accessTokenExpiry = new Date(response.data.accessTokenExpires);
      }

      // Update auth state (this will also update React state via registered setters)
      updateAuthState(userData, companyData);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isAuthenticated', 'true');
      }

      initialAuthCheckDone = true;
      initialAuthCheckResult = true;
      // console.log('Auth check successful');
      return true;
      
    } catch (error: any) {
      // Only clear state if this is a real auth failure, not a network error
      if (error.response?.status === 401) {
        clearAuthState();
      }
      initialAuthCheckDone = true;
      initialAuthCheckResult = false;
      return false;
    }
  })();

  return initialAuthCheckPromise;
};

// Reset auth check (call this ONLY on logout)
export const resetAuthCheck = () => {
  initialAuthCheckDone = false;
  initialAuthCheckPromise = null;
  initialAuthCheckResult = null;
};

// Check if token is expired
export const isAccessTokenExpired = (): boolean => {
  if (!accessTokenExpiry) return true;
  return new Date() >= new Date(accessTokenExpiry.getTime() - 30 * 1000);
};

// Get current auth state
export const getAuthState = () => {
  return {
    isAuthenticated: !isAccessTokenExpired(),
    user: currentUser,
    company: currentCompany,
    initialAuthCheckDone,
    isRefreshing
  };
};

// Login function
export const login = async (email: string, password: string): Promise<any> => {
  try {
    const response = await axiosInstance.post('/auth/login', {
      email,
      password
    }, {
      _skipAuthCheck: true
    } as any);
    
    if (response.data.accessToken) {
      accessToken = response.data.accessToken;
      accessTokenExpiry = new Date(response.data.accessTokenExpires);
    }
    
    if (response.data.user) {
      updateAuthState(response.data.user, response.data.company);
    }
    
    initialAuthCheckResult = true;
    initialAuthCheckDone = true;
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('isAuthenticated', 'true');
    }

    
    return response;
  } catch (error) {
    clearAuthState();
    throw error;
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    await axiosInstance.post('/auth/logout', {}, {
      _skipAuthCheck: true,
      _skipRefresh: true
    } as any);
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthState();
    resetAuthCheck();
    sessionStorage.clear();
    localStorage.clear();
    // if (typeof window !== 'undefined') {
    //   window.location.href = '/auth/login';
    // }
  }
};

// Confirm account (anonymous) — verifies the email link token
export const confirmAccount = async (
  token: string,
  email: string
): Promise<{ email: string; token: string; message: string }> => {

  const response = await axiosInstance.get('/auth/account/confirm', {
    params: { Token: token, email },
    _skipAuthCheck: true,
    _skipRefresh: true,
  } as any);

  return response.data;
};

// Set password (anonymous) — completes the invitation flow
export const setPassword = async (payload: {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post('/auth/set-Password', payload, {
    _skipAuthCheck: true,
    _skipRefresh: true,
  } as any);

  return response.data;
};

export default axiosInstance;
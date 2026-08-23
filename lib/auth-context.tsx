'use client';
import React, { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { Company, User } from './types';
import { performInitialAuthCheck, getAuthState, registerAuthSetters } from './customAxios';
import {AppInitializationSkeleton} from '@/components/SkeletonLoading';
import { logout } from './customAxios';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import SelectCompany from '@/app/select-shop/page';

interface AuthContextType {
  isAuthenticated: boolean;
  user: Partial<User>;
  company: Partial<Company>;
  selectedShop: string;
  setUser: React.Dispatch<React.SetStateAction<Partial<User>>>;
  setCompany: React.Dispatch<React.SetStateAction<Partial<Company>>>;
  setSelectedShop: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  userLogOut  : () => {}
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const {toast} = useToast()
  const router = useRouter()
  const [user, setUser] = useState<Partial<User>>({});
  const [company, setCompany] = useState<Partial<Company>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<string>("");
  
  const initializationStarted = useRef(false);
  const authCheckCompleted = useRef(false);

  const userLogOut = async () => {
    setSelectedShop("")
    setUser({})
    setCompany({})
    sessionStorage.clear()
    localStorage.clear()
    
    await logout()
    router.push("/auth/login")
    return;
  }
  // Register setters with axios instance ONCE
  useEffect(() => {
    // console.log('Registering auth setters');
    registerAuthSetters(setUser, setCompany);
  }, []);

  useEffect(() => {

    // Prevent multiple initializations
    if (initializationStarted.current) {
      // console.log('Initialization already started, skipping');
      return;
    }
    initializationStarted.current = true;

    let isMounted = true;

    const initializeApp = async () => {
      try {
        // console.log('Starting app initialization...');
        
        // Perform auth check - this will only run once due to caching
        const authResult = await performInitialAuthCheck() ;
        
        if (isMounted && !authCheckCompleted.current) {
          authCheckCompleted.current = true;
          setIsAuthenticated(authResult && !user.id);
          
          // Get the latest auth state
          const authState = getAuthState();
          // console.log('Final auth state:', {
          //   authResult,
          //   user: authState.user,
          //   company: authState.company
          // });
          
          // Ensure React state is in sync
          if (Object.keys(authState.user).length > 0) {
            setUser(authState.user);
            setCompany(authState.company);
          }
        }

        if (!authResult) {
         // setIsLoading(false)
          toast.warning({
            title: 'Failed to authenticate user',
            description:  'Logging You Out...',
          })

          setTimeout(() => {
            userLogOut()
          }, 3000)
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array

  
  if (isLoading && !user?.id) {
    return <AppInitializationSkeleton />;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      company,
      selectedShop,
      setUser,
      setCompany,
      setSelectedShop,
      isLoading,
      userLogOut
    }}>
      {!(selectedShop || sessionStorage.getItem("selectedShop"))  && !(window.location.pathname  === "/" ||  window.location.pathname  === "/auth/login")?  <SelectCompany/> : children }
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
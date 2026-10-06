'use client';
import React, { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { Company, User } from './types';
import { performInitialAuthCheck, getAuthState, registerAuthSetters } from './customAxios';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { logout } from './customAxios';
import { useToaster } from '@/components/util/CustomToast';
import { useRouter } from 'next/navigation';
import { publicPaths } from '@/components/util/AppConfig';

interface AuthContextType {
  isAuthenticated: boolean;
  user: Partial<User>;
  company: Partial<Company>;
  selectedShop: string;
  setUser: React.Dispatch<React.SetStateAction<Partial<User>>>;
  setCompany: React.Dispatch<React.SetStateAction<Partial<Company>>>;
  setSelectedShop: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  userLogOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const toast = useToaster();
  const router = useRouter();
  const [user, setUser] = useState<Partial<User>>({});
  const [company, setCompany] = useState<Partial<Company>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<string>("");

  const initializationStarted = useRef(false);
  const authCheckCompleted = useRef(false);

  const userLogOut = async () => {
    setSelectedShop("");
    setUser({});
    setCompany({});
    sessionStorage.clear();
    localStorage.clear();

    await logout();

    const path = window.location.pathname?.toLowerCase() || '/';
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    if (!publicPaths.includes(normalized)) {
      router.push("/auth/login");
    }
  };

  // Register setters with axios instance ONCE
  useEffect(() => {
    registerAuthSetters(setUser, setCompany);
  }, []);

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    let isMounted = true;

    const initializeApp = async () => {
      setIsLoading(true);
      try {
        const authResult = await performInitialAuthCheck();

        if (isMounted && !authCheckCompleted.current) {
          authCheckCompleted.current = true;
          setIsAuthenticated(!!authResult);

          const authState = getAuthState();

          if (Object.keys(authState.user).length > 0) {
            setUser(authState.user);
            setCompany(authState.company);
          }
        }

        if (!authResult) {
          toast.warning({
            title: 'Failed to authenticate user',
            description: 'Logging You Out...',
          });

          setTimeout(() => {
            userLogOut();
          }, 3000);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      userLogOut,
    }}>
      {children}
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
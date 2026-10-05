'use client';
import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import { Company, User } from './types';
import {
  performInitialAuthCheck,
  getAuthState,
  registerAuthSetters,
  resetAuthCheck,
} from './customAxios';
import { LoadingOverlay } from '@/components/SkeletonLoading';
import { logout } from './customAxios';
import { useToaster } from '@/components/util/CustomToast';
import { useRouter, usePathname } from 'next/navigation';
import SelectCompany from '@/app/select-shop/page';
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

// Normalize path for publicPaths comparison
const normalizePath = (p: string | null | undefined): string => {
  if (!p) return '';
  return p.toLowerCase().replace(/^\/+/, '');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const toast = useToaster();
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<Partial<User>>({});
  const [company, setCompany] = useState<Partial<Company>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<string>('');

  const isPublicPage = publicPaths.includes(normalizePath(pathname));

  // ────────────────────────────────────────────────
  // Active logout (user-initiated)
  // ────────────────────────────────────────────────
  const userLogOut = async (): Promise<void> => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }

    setIsAuthenticated(false);
    setSelectedShop('');
    setUser({});
    setCompany({});
    sessionStorage.clear();
    localStorage.clear();

    if (!isPublicPage) {
      router.push('/auth/login');
    }
  };

  // ────────────────────────────────────────────────
  // Register axios setters once
  // ────────────────────────────────────────────────
  useEffect(() => {
    registerAuthSetters(setUser, setCompany);
  }, []);

  // ────────────────────────────────────────────────
  // Initial auth check — always runs the effect, relies
  // on performInitialAuthCheck for deduplication
  // ────────────────────────────────────────────────
  useEffect(() => {
    // Skip entirely on public pages
    if (isPublicPage) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const initializeApp = async () => {
      setIsLoading(true);
      try {
        const authResult = await performInitialAuthCheck();

        if (!isMounted) return;

        setIsAuthenticated(authResult);

        const authState = getAuthState();
        if (Object.keys(authState.user).length > 0) {
          setUser(authState.user);
          setCompany(authState.company);
        }

        if (!authResult) {
          toast.warning({
            title: 'Failed to authenticate user',
            description: 'Redirecting to login...',
          });
          setTimeout(() => {
            if (isMounted) router.push('/auth/login');
          }, 1500);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          router.push('/auth/login');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicPage]);

  // ────────────────────────────────────────────────
  // Loading gate
  // ────────────────────────────────────────────────
  if (isLoading && !isPublicPage && !user?.id) {
    return <LoadingOverlay />;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        company,
        selectedShop,
        setUser,
        setCompany,
        setSelectedShop,
        isLoading,
        userLogOut,
      }}
    >
      {user?.id && !(selectedShop || sessionStorage.getItem('selectedShop')) ? (
        <SelectCompany />
      ) : (
        children
      )}
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
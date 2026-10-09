'use client';
import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Company, User } from './types';
import {
  performInitialAuthCheck,
  getAuthState,
  registerAuthSetters,
  logout,
  readCachedAuthSnapshot,
  setSelectedShopPersisted,
  getSelectedShop,
} from './customAxios';
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
  const router = useRouter();

  // Synchronous snapshot: module state is hydrated from sessionStorage at
  // module load, so this has real data on the very first render.
  const snapshot = useMemo(() => readCachedAuthSnapshot(), []);

  const [user, setUser] = useState<Partial<User>>(() => snapshot.user ?? {});
  const [company, setCompany] = useState<Partial<Company>>(
    () => snapshot.company ?? {}
  );
  const [selectedShop, setSelectedShop] = useState<string>(
    () => snapshot.selectedShop ?? ''
  );

  // isAuthenticated starts false. It flips to true only after
  // performInitialAuthCheck() actually hears from the server (or login sets it).
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Only "loading" if we had no cached user to render.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => Object.keys(snapshot.user ?? {}).length === 0
  );

  // Persist shop when it changes
  useEffect(() => {
    setSelectedShopPersisted(selectedShop);
  }, [selectedShop]);

  const userLogOut = useCallback(async () => {
    setSelectedShop('');
    setUser({});
    setCompany({});
    setIsAuthenticated(false);

    await logout(); // internally clears sessionStorage + localStorage + module state

    const path = window.location.pathname?.toLowerCase() || '/';
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    if (!publicPaths.includes(normalized)) {
      router.replace('/auth/login');
    }
  }, [router]);

  // Register setters with axios once
  useEffect(() => {
    registerAuthSetters(setUser, setCompany);
  }, []);

  // Reconcile with server on mount
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      if (Object.keys(snapshot.user ?? {}).length === 0) {
        setIsLoading(true);
      }

      try {
        const authResult = await performInitialAuthCheck();
        if (!isMounted) return;

        setIsAuthenticated(!!authResult);

        const authState = getAuthState();
        if (Object.keys(authState.user ?? {}).length > 0) {
          setUser(authState.user);
          setCompany(authState.company);
        }

        // Default the shop if still empty
        if (!getSelectedShop()) {
          const locations: any[] = (authState.user as any)?.locations ?? [];
          if (locations.length > 0) {
            setSelectedShop(String(locations[0].id));
          }
        }
      } catch (error) {
        console.error('[auth] initialization error:', error);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
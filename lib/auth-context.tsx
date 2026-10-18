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
  // ✅ NEW: atomic post-login hydration.
  loginSuccess: (user: Partial<User>, company: Partial<Company>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  const snapshot = useMemo(() => readCachedAuthSnapshot(), []);

  const [user, setUser] = useState<Partial<User>>(() => snapshot.user ?? {});
  const [company, setCompany] = useState<Partial<Company>>(
    () => snapshot.company ?? {}
  );
  const [selectedShop, setSelectedShop] = useState<string>(
    () => snapshot.selectedShop ?? ''
  );

  // isAuthenticated is the single source of truth for the React tree.
  // True only when (a) performInitialAuthCheck succeeded on mount, or
  // (b) loginSuccess() was called after a successful login.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(
    () => Object.keys(snapshot.user ?? {}).length === 0
  );

  // Persist shop when it changes. Empty value removes the key
  // (handled by setSelectedShopPersisted).
  useEffect(() => {
    setSelectedShopPersisted(selectedShop);
  }, [selectedShop]);

  // ✅ NEW: single atomic entry point for login success.
  const loginSuccess = useCallback(
    (u: Partial<User>, c: Partial<Company>) => {
      setUser(u);
      setCompany(c);
      setIsAuthenticated(true);
      // Do NOT touch selectedShop here. /select-shop decides it.
    },
    []
  );

  // ✅ Logout: clear React state, then storage, then module state.
  const userLogOut = useCallback(async () => {
    // 1. Clear React state (triggers persistence effect with '').
    setUser({});
    setCompany({});
    setSelectedShop('');
    setIsAuthenticated(false);

    // 2. Clear storage immediately.
    sessionStorage.clear();
    localStorage.clear();

    // 3. Clear module state + server logout.
    await logout();

    // 4. Defensive: re-remove shop keys after async clears.
    sessionStorage.removeItem('selectedShop');
    localStorage.removeItem('selectedShop');

    // 5. Navigate away from protected pages.
    const path = window.location.pathname?.toLowerCase() || '/';
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    if (!publicPaths.includes(normalized)) {
      router.replace('/auth/login');
    }
  }, [router]);

  // Register axios-side setters once.
  useEffect(() => {
    registerAuthSetters(setUser, setCompany);
  }, []);

  // Mount-time server reconciliation.
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      if (Object.keys(snapshot.user ?? {}).length === 0) {
        setIsLoading(true);
      }

      try {
        let authResult = await performInitialAuthCheck();

        if (!authResult && isMounted) {
          await new Promise((r) => setTimeout(r, 400));
          if (!isMounted) return;
          authResult = await performInitialAuthCheck(true);
        }

        if (!isMounted) return;

        setIsAuthenticated(!!authResult);

        const authState = getAuthState();
        if (Object.keys(authState.user ?? {}).length > 0) {
          setUser(authState.user);
          setCompany(authState.company);
        }

        // ✅ REMOVED: auto-select-shop block. /select-shop is now the
        // mandatory entry point when no shop is persisted.

        if (!authResult) {
          const path = window.location.pathname?.toLowerCase() || '/';
          const normalized = path.startsWith('/') ? path.slice(1) : path;
          if (!publicPaths.includes(normalized)) {
          //  router.replace('/auth/login');
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
        loginSuccess,
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
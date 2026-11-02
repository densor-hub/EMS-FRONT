'use client';
import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Company, User } from './types';
import axiosInstance, {
  performInitialAuthCheck,
  getAuthState,
  registerAuthSetters,
  logout,
  readCachedAuthSnapshot,
  setSelectedShopPersisted,
  onForcedLogout,
} from './customAxios';
import { useRouter } from 'next/navigation';
import { publicPaths, settings } from '@/components/util/AppConfig';


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
  loginSuccess: (user: Partial<User>, company: Partial<Company>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const routerRef = useRef(router);
  
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Read cache synchronously on first render
  const snapshot = useMemo(() => readCachedAuthSnapshot(), []);

  const [user, setUser] = useState<Partial<User>>(() => snapshot.user ?? {});
  const [company, setCompany] = useState<Partial<Company>>(() => snapshot.company ?? {});
  const [selectedShop, setSelectedShop] = useState<string>(() => snapshot.selectedShop ?? '');
  

  const [isAuthenticated, setIsAuthenticatedRaw] = useState<boolean>(
    () => snapshot.isAuthenticated === true
  );
  
  // Only start loading if we have no cached user data
  const [isLoading, setIsLoading] = useState<boolean>(
    () => Object.keys(snapshot.user ?? {}).length === 0
  );

  const setIsAuthenticated = useCallback((value: boolean) => {
    setIsAuthenticatedRaw(value);
  }, []);

  

  useEffect(() => {
    setSelectedShopPersisted(selectedShop);
  }, [selectedShop]);

  const loginSuccess = useCallback(
    (u: Partial<User>, c: Partial<Company>) => {
      setUser(u);
      setCompany(c);
      setIsAuthenticated(true);
      setIsLoading(false); // Stop loading immediately on manual login
    },
    [setIsAuthenticated]
  );

  const userLogOut = useCallback(async () => {
    const path = window.location.pathname?.toLowerCase() || '/';
    const normalized = path.startsWith('/') ? path.slice(1) : path;

    if (!publicPaths.includes(normalized)) {
      routerRef.current.replace('/auth/login');
    }

    setUser({});
    setCompany({});
    setSelectedShop('');
    setIsAuthenticated(false);
    sessionStorage.clear();
    localStorage.clear();

    try {
      await logout();
    } catch (err) {
      console.warn('[auth] logout failed (ignored):', err);
    }
  }, [setIsAuthenticated]);

  useEffect(() => {
    const unsubscribe = onForcedLogout(userLogOut);
    return () => { unsubscribe(); };
  }, [userLogOut]);

  useEffect(() => {
    registerAuthSetters(setUser, setCompany);
  }, []);

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
      
      } catch (error) {
        console.error('[auth] initialization error:', error);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeApp();

    return () => { isMounted = false; };
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
      {/* Render children immediately! No full-screen blocking spinner here anymore */}
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
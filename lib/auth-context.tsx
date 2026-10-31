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
import { publicPaths } from '@/components/util/AppConfig';
import { SystemSettings } from '@/app/settings/page';
import { sessionStore, SETTINGS_CACHE_KEY, toastErrors } from '@/helpers/formatStrings';
import { toast } from 'sonner';

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
  // console.log('[AuthProvider] MOUNT');

  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const snapshot = useMemo(() => readCachedAuthSnapshot(), []);

  const [user, setUser] = useState<Partial<User>>(() => snapshot.user ?? {});
  const [company, setCompany] = useState<Partial<Company>>(() => snapshot.company ?? {});
  const [selectedShop, setSelectedShop] = useState<string>(() => snapshot.selectedShop ?? '');

  const [isAuthenticated, setIsAuthenticatedRaw] = useState<boolean>(
    () => snapshot.isAuthenticated === true
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => Object.keys(snapshot.user ?? {}).length === 0
  );

  // ─── Traced setter — logs the exact call stack of every flip ───
  const setIsAuthenticated = useCallback((value: boolean) => {
    // console.trace('[setIsAuthenticated]', value);
    setIsAuthenticatedRaw(value);
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const res = await axiosInstance.get(
        `/System/Settings/${sessionStore.get("selectedShop")}`
      );
      const body = res?.data?.data ?? res?.data ?? {};

      const settings: SystemSettings = {
        locationId: body.locationId ?? selectedShop,
        saleToDeliveryMode: Boolean(body.saleToDeliveryMode),
        recordingOldTransactions: Boolean(body.recordingOldTransactions),
        minimumSalePaymentPercentage: Number(body.minimumSalePaymentPercentage),
        posPrinterSize: Number(body.posPrinterSize),
        defaultPageSize: Number(body.defaultPageSize),
        currency: String(body.currency ?? ""),
      };

      sessionStore.set(SETTINGS_CACHE_KEY, JSON.stringify(settings));
    } catch (err: any) {
      console.error("Error loading settings:", err);
    }
  };

  useEffect(() => {
    setSelectedShopPersisted(selectedShop);
  }, [selectedShop]);

  const loginSuccess = useCallback(
    (u: Partial<User>, c: Partial<Company>) => {
      // console.trace('[loginSuccess] CALLED');
      setUser(u);
      setCompany(c);
      setIsAuthenticated(true);
    },
    [setIsAuthenticated]
  );

  const userLogOut = useCallback(async () => {
    // console.log('[userLogOut] START');

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

    // console.log('[userLogOut] END');
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
      // console.log('[initializeApp] START', {
      //   snapshotUserKeys: Object.keys(snapshot.user ?? {}).length,
      // });

      if (Object.keys(snapshot.user ?? {}).length === 0) {
        setIsLoading(true);
      }

      try {
        const authResult = await performInitialAuthCheck();
        // console.log('[initializeApp] performInitialAuthCheck returned', authResult, {
        //   isMounted,
        // });

        if (!isMounted) return;

        setIsAuthenticated(!!authResult);

        const authState = getAuthState();
        if (Object.keys(authState.user ?? {}).length > 0) {
          setUser(authState.user);
          setCompany(authState.company);
        }

        if (authResult && selectedShop) {
          loadSettings();
        }
      } catch (error) {
        console.error('[auth] initialization error:', error);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsLoading(false);
        console.log('[initializeApp] END');
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
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
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
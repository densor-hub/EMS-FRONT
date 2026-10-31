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
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const snapshot = useMemo(() => readCachedAuthSnapshot(), []);
  
  const [user, setUser] = useState<Partial<User>>(() => snapshot.user ?? {});
  const [company, setCompany] = useState<Partial<Company>>(
    () => snapshot.company ?? {}
  );
  const [selectedShop, setSelectedShop] = useState<string>(
    () => snapshot.selectedShop ?? ''
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(
    () => Object.keys(snapshot.user ?? {}).length === 0
  );

  
  const loadSettings = async (): Promise<void> => {

    try{
      const res = await axiosInstance.get(`/System/Settings/${sessionStore.get("selectedShop")}`);
      const body = res?.data?.data ?? res?.data ?? {};

      // Trust the API. Coerce only for type-safety, do NOT inject defaults.
      const settings: SystemSettings = {
        locationId: body.locationId?? selectedShop,
        saleToDeliveryMode: Boolean(body.saleToDeliveryMode),
        recordingOldTransactions: Boolean(body.recordingOldTransactions),
        minimumSalePaymentPercentage: Number(body.minimumSalePaymentPercentage),
        posPrinterSize: Number(body.posPrinterSize),
        defaultPageSize: Number(body.defaultPageSize),
        currency: String(body.currency ?? ""),
      };

      // setSystemSettings(settings);
      sessionStore.set(SETTINGS_CACHE_KEY, JSON.stringify(settings))
    } catch (err: any) {
      console.error("Error loading settings:", err);
      //toastErrors(err?.response?.data?.message );
      // setSystemSettings(null);
    }
  };

  useEffect(() => {
    setSelectedShopPersisted(selectedShop);
  }, [selectedShop]);

  const loginSuccess = useCallback(
    (u: Partial<User>, c: Partial<Company>) => {
      setUser(u);
      setCompany(c);
      setIsAuthenticated(true);
    },
    []
  );

  const userLogOut = useCallback(async () => {
    setUser({});
    setCompany({});
    setSelectedShop('');
    setIsAuthenticated(false);

    sessionStorage.clear();
    localStorage.clear();

    await logout();

    sessionStorage.removeItem('selectedShop');
    localStorage.removeItem('selectedShop');

    const path = window.location.pathname?.toLowerCase() || '/';
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    if (!publicPaths.includes(normalized)) {
      routerRef.current.replace('/auth/login');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onForcedLogout(userLogOut);
    return () => {
      unsubscribe();
    };
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

        loadSettings();
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
      {/* ✅ Gate children on isLoading so no page fires an API call
          before the initial auth check has decided a token exists.
          Without this, every page's first GET fires with the old
          token, 401s, triggers a refresh, and the sequence becomes
          refresh → GET 200 → refresh → GET 200 → refresh. */}
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
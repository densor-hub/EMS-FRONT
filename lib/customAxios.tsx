// lib/customAxios.ts
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { Company, User } from './types';

const baseURL = '/api';

// ---------- browser-safe storage ----------
const isBrowser = () => typeof window !== 'undefined';

const safeSession = {
  get: (k: string) => (isBrowser() ? window.sessionStorage.getItem(k) : null),
  set: (k: string, v: string) => {
    if (isBrowser()) window.sessionStorage.setItem(k, v);
  },
  remove: (k: string) => {
    if (isBrowser()) window.sessionStorage.removeItem(k);
  },
  clear: () => {
    if (isBrowser()) window.sessionStorage.clear();
  },
};

const safeLocal = {
  get: (k: string) => (isBrowser() ? window.localStorage.getItem(k) : null),
  set: (k: string, v: string) => {
    if (isBrowser()) window.localStorage.setItem(k, v);
  },
  remove: (k: string) => {
    if (isBrowser()) window.localStorage.removeItem(k);
  },
  clear: () => {
    if (isBrowser()) window.localStorage.clear();
  },
};

// ---------- sessionStorage keys ----------
const SK = {
  accessToken: 'accessToken',
  user: 'authUser',
  company: 'authCompany',
  selectedShop: 'selectedShop',
  isAuthenticated: 'isAuthenticated',
} as const;

// ---------- module state ----------
let isRefreshing = false;
let accessToken: string | null = null;
let accessTokenExpiry: Date | null = null;
let currentUser: Partial<User> = {};
let currentCompany: Partial<Company> = {};

let initialAuthCheckDone = false;
let initialAuthCheckPromise: Promise<boolean> | null = null;
let initialAuthCheckResult: boolean | null = null;

let hasReconciledWithServer = false;

let consecutiveRefreshFailures = 0;

let userStateSetter: ((user: Partial<User>) => void) | null = null;
let companyStateSetter: ((company: Partial<Company>) => void) | null = null;

// ---------- hydration at module load ----------
(() => {
  if (!isBrowser()) return;

  const token = safeSession.get(SK.accessToken);
  if (token) accessToken = token;

  try {
    const rawUser = safeSession.get(SK.user);
    if (rawUser) currentUser = JSON.parse(rawUser);
  } catch {
    currentUser = {};
  }

  try {
    const rawCompany = safeSession.get(SK.company);
    if (rawCompany) currentCompany = JSON.parse(rawCompany);
  } catch {
    currentCompany = {};
  }
})();

// ---------- axios instance ----------
const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ---------- request interceptor: attach bearer token ----------
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const skipAuth = (config as any)._skipAuthCheck === true;
  if (!skipAuth && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---------- refresh (deduped) ----------
type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthCheck?: boolean;
  _skipRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );
      const token: string | undefined =
        res.data?.accessToken ?? res.data?.token;
      if (token) {
        accessToken = token;
        if (res.data?.accessTokenExpires) {
          accessTokenExpiry = new Date(res.data.accessTokenExpires);
        }
        safeSession.set(SK.accessToken, token);
      }
      return token ?? null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (!original) return Promise.reject(error);
    if (error.response?.status !== 401) return Promise.reject(error);
    if (original._retry) return Promise.reject(error);
    if (original._skipRefresh) return Promise.reject(error);
    if (original.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    original._retry = true;

    const token = await refreshAccessToken();

    if (!token) {
      accessToken = null;
      accessTokenExpiry = null;
      safeSession.remove(SK.accessToken);
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${token}`;
    return axiosInstance(original);
  }
);

// ---------- state helpers ----------
export const registerAuthSetters = (
  setUser: (user: Partial<User>) => void,
  setCompany: (company: Partial<Company>) => void
) => {
  userStateSetter = setUser;
  companyStateSetter = setCompany;

  if (Object.keys(currentUser).length > 0) setUser(currentUser);
  if (Object.keys(currentCompany).length > 0) setCompany(currentCompany);
};

const updateAuthState = (user?: Partial<User>, company?: Partial<Company>) => {
  if (user && Object.keys(user).length > 0) {
    currentUser = { ...currentUser, ...user };
    safeSession.set(SK.user, JSON.stringify(currentUser));
    userStateSetter?.(currentUser);
  }
  if (company && Object.keys(company).length > 0) {
    currentCompany = { ...currentCompany, ...company };
    safeSession.set(SK.company, JSON.stringify(currentCompany));
    companyStateSetter?.(currentCompany);
  }
};

export const clearAuthState = () => {
  currentUser = {};
  currentCompany = {};
  accessToken = null;
  accessTokenExpiry = null;
  initialAuthCheckDone = false;
  initialAuthCheckPromise = null;
  initialAuthCheckResult = null;
  hasReconciledWithServer = false;
  consecutiveRefreshFailures = 0;

  safeSession.clear();
  safeLocal.clear();

  userStateSetter?.({});
  companyStateSetter?.({});
};

// ---------- selected shop (persisted in sessionStorage) ----------
export const getSelectedShop = (): string =>
  safeSession.get(SK.selectedShop) ?? '';

export const setSelectedShopPersisted = (id: string) => {
  // ✅ Empty value must REMOVE the key, not write '' or '""'.
  if (id) safeSession.set(SK.selectedShop, id);
  else {
    safeSession.remove(SK.selectedShop);
    safeLocal.remove(SK.selectedShop);
  }
};

// ---------- synchronous snapshot for the React context ----------
export const readCachedAuthSnapshot = () => ({
  user: currentUser,
  company: currentCompany,
  selectedShop: getSelectedShop(),
  isAuthenticated: hasReconciledWithServer && initialAuthCheckResult === true,
});

// ---------- initial auth check ----------
export const performInitialAuthCheck = async (
  force: boolean = false,
  setUser?: React.Dispatch<React.SetStateAction<Partial<User>>>,
  setCompany?: React.Dispatch<React.SetStateAction<Partial<Company>>>
): Promise<boolean> => {
  if (setUser && setCompany) registerAuthSetters(setUser, setCompany);

  if (!force && hasReconciledWithServer && initialAuthCheckResult === true) {
    return true;
  }
  if (!force && initialAuthCheckPromise) return initialAuthCheckPromise;

  initialAuthCheckPromise = (async () => {
    try {
      const response = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const fullName = response?.data?.fullName || '';
      const nameParts = fullName.split(' ').filter(Boolean);
      const userData: Partial<User> = {
        lastName: nameParts[nameParts.length - 1] || '',
        firstName: nameParts[0] || '',
        id: response?.data?.id,
        companyId: response?.data?.company?.id,
        routes: response?.data?.routes || [],
        locations: response?.data?.locations || [],
      };

      const companyData: Partial<Company> = {
        id: response?.data?.company?.id,
        name: response?.data?.company?.name,
      };

      if (response.data.accessToken) {
        accessToken = response.data.accessToken;
        accessTokenExpiry = new Date(response.data.accessTokenExpires);
        safeSession.set(SK.accessToken, accessToken ?? '');
      }

      updateAuthState(userData, companyData);
      safeSession.set(SK.isAuthenticated, 'true');

      consecutiveRefreshFailures = 0;

      // ✅ ROOT-CAUSE FIX: removed the auto-select-shop block.
      // Previously:
      //   if (isBrowser() && !safeSession.get(SK.selectedShop)) {
      //     const locations = userData.locations ?? [];
      //     if (locations.length > 0) {
      //       safeSession.set(SK.selectedShop, String(locations[0].id));
      //     }
      //   }
      // That block silently re-populated selectedShop on every auth
      // reconciliation (mount, retry, hard reload), which caused
      // /select-shop to be skipped after logout + re-login.
      // The shop is now chosen explicitly on /select-shop.

      initialAuthCheckDone = true;
      initialAuthCheckResult = true;
      hasReconciledWithServer = true;
      return true;
    } catch (error: any) {
      console.error('[auth] initial check failed:', error?.message);

      initialAuthCheckDone = true;
      initialAuthCheckResult = false;
      hasReconciledWithServer = true;
      initialAuthCheckPromise = null;

      if (error?.response?.status === 401) {
        consecutiveRefreshFailures++;
        if (consecutiveRefreshFailures >= 2) {
          clearAuthState();
        }
      }

      return false;
    }
  })();

  return initialAuthCheckPromise;
};

export const resetAuthCheck = () => {
  initialAuthCheckDone = false;
  initialAuthCheckPromise = null;
  initialAuthCheckResult = null;
  hasReconciledWithServer = false;
  consecutiveRefreshFailures = 0;
};

export const isAccessTokenExpired = (): boolean => {
  if (!accessTokenExpiry) return true;
  return new Date() >= new Date(accessTokenExpiry.getTime() - 30 * 1000);
};

export const getAuthState = () => ({
  isAuthenticated:
    hasReconciledWithServer &&
    initialAuthCheckResult === true &&
    !!accessToken &&
    !isAccessTokenExpired(),
  user: currentUser,
  company: currentCompany,
  initialAuthCheckDone,
  isRefreshing,
});

// ---------- login ----------
export const login = async (email: string, password: string): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      '/auth/login',
      { email, password },
      { _skipAuthCheck: true, _skipRefresh: true } as any
    );

    const data = response.data;

    if (data.accessToken) {
      accessToken = data.accessToken;
      accessTokenExpiry = data.accessTokenExpires
        ? new Date(data.accessTokenExpires)
        : null;
      safeSession.set(SK.accessToken, accessToken ?? '');
    }

    const fullName = data.fullName || '';
    const nameParts = fullName.split(' ').filter(Boolean);

    const userData: Partial<User> = {
      id: data.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      companyId: data.company?.id,
      email: data.email,
      phone: data.phoneNumber ?? data.phone,
      role: data.role,
      locations: data.locations ?? [],
      routes: data.routes ?? [],
    };

    const companyData: Partial<Company> = {
      id: data.company?.id,
      name: data.company?.name,
    };

    updateAuthState(userData, companyData);

    initialAuthCheckResult = true;
    initialAuthCheckDone = true;
    initialAuthCheckPromise = Promise.resolve(true);
    hasReconciledWithServer = true;
    consecutiveRefreshFailures = 0;

    safeSession.set(SK.isAuthenticated, 'true');

    // ✅ Login NEVER auto-selects a shop. The user picks one on
    // /select-shop (or is skipped if sessionStorage already has one).

    return response;
  } catch (error) {
    clearAuthState();
    throw error;
  }
};

// ---------- logout ----------
export const logout = async (): Promise<void> => {
  try {
    await axiosInstance.post(
      '/auth/logout',
      {},
      { _skipAuthCheck: true, _skipRefresh: true } as any
    );
  } catch (error) {
    console.error('[auth] logout error:', error);
  } finally {
    clearAuthState();
    resetAuthCheck();
  }
};

// ---------- anonymous helpers ----------
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

export const setPassword = async (payload: {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post('/auth/set-password', payload, {
    _skipAuthCheck: true,
    _skipRefresh: true,
  } as any);
  return response.data;
};

export default axiosInstance;
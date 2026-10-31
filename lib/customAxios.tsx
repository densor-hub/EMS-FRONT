// lib/customAxios.ts
import type React from 'react';
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
  set: (k: string, v: string) => { if (isBrowser()) window.sessionStorage.setItem(k, v); },
  remove: (k: string) => { if (isBrowser()) window.sessionStorage.removeItem(k); },
  clear: () => { if (isBrowser()) window.sessionStorage.clear(); },
};

const safeLocal = {
  get: (k: string) => (isBrowser() ? window.localStorage.getItem(k) : null),
  set: (k: string, v: string) => { if (isBrowser()) window.localStorage.setItem(k, v); },
  remove: (k: string) => { if (isBrowser()) window.localStorage.removeItem(k); },
  clear: () => { if (isBrowser()) window.localStorage.clear(); },
};

const SK = {
  accessToken: 'accessToken',
  accessTokenExpiry: 'accessTokenExpiry',
  user: 'authUser',
  company: 'authCompany',
  selectedShop: 'selectedShop',
  isAuthenticated: 'isAuthenticated',
  justLoggedOut: 'justLoggedOut',
} as const;

const REFRESH_PATH = '/auth/refresh';

// ---------- module state ----------
let accessToken: string | null = null;
let accessTokenExpiry: Date | null = null;
let currentUser: Partial<User> = {};
let currentCompany: Partial<Company> = {};

let initialAuthCheckDone = false;
let initialAuthCheckPromise: Promise<boolean> | null = null;
let initialAuthCheckResult: boolean | null = null;
let hasReconciledWithServer = false;

let consecutiveRefreshFailures = 0;
const REFRESH_FAILURE_THRESHOLD = 2;

// ---------- logout gate ----------
let postLogout = false;
let loggingOut = false;

const isPostLogout = (): boolean => {
  if (postLogout) return true;
  if (isBrowser() && safeSession.get(SK.justLoggedOut) === '1') return true;
  return false;
};

const markPostLogout = () => {
  postLogout = true;
  if (isBrowser()) safeSession.set(SK.justLoggedOut, '1');
};

const clearPostLogout = () => {
  postLogout = false;
  if (isBrowser()) safeSession.remove(SK.justLoggedOut);
};

// ---------- forced-logout signal ----------
type ForcedLogoutListener = () => void | Promise<void>;
const forcedLogoutListeners = new Set<ForcedLogoutListener>();

export const onForcedLogout = (listener: ForcedLogoutListener): (() => void) => {
  forcedLogoutListeners.add(listener);
  return () => { forcedLogoutListeners.delete(listener); };
};

const notifyForcedLogout = async (): Promise<void> => {
  for (const listener of Array.from(forcedLogoutListeners)) {
    try { await listener(); }
    catch (err) { console.error('[auth] forced-logout listener failed:', err); }
  }
};

let userStateSetter: ((user: Partial<User>) => void) | null = null;
let companyStateSetter: ((company: Partial<Company>) => void) | null = null;

// ---------- hydration at module load ----------
(() => {
  if (!isBrowser()) return;

  const token = safeSession.get(SK.accessToken);
  if (token) accessToken = token;

  const expiryStr = safeSession.get(SK.accessTokenExpiry);
  if (expiryStr) {
    const p = new Date(expiryStr);
    if (!isNaN(p.getTime())) accessTokenExpiry = p;
  }

  try {
    const rawUser = safeSession.get(SK.user);
    if (rawUser) currentUser = JSON.parse(rawUser);
  } catch { currentUser = {}; }

  try {
    const rawCompany = safeSession.get(SK.company);
    if (rawCompany) currentCompany = JSON.parse(rawCompany);
  } catch { currentCompany = {}; }

  // Restore gate from sessionStorage on module reload (Fast Refresh, etc.)
  if (safeSession.get(SK.justLoggedOut) === '1') postLogout = true;

  console.log('[customAxios] MODULE LOADED', {
    hasToken: !!token,
    postLogout,
    ss_justLoggedOut: safeSession.get(SK.justLoggedOut),
  });
})();

// ---------- axios instances ----------
const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const rawInstance: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const skipAuth = (config as any)._skipAuthCheck === true;
  if (!skipAuth && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---------- refresh ----------
type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthCheck?: boolean;
  _skipRefresh?: boolean;
};

type RefreshResult = {
  token: string | null;
  profile?: {
    id?: User['id'];
    fullName?: string;
    company?: { id?: Company['id']; name?: Company['name'] };
    routes?: NonNullable<User['routes']>;
    locations?: NonNullable<User['locations']>;
  };
};

let refreshPromise: Promise<RefreshResult> | null = null;

const recordRefreshFailure = async (reason: string): Promise<void> => {
  consecutiveRefreshFailures += 1;
  console.warn(
    `[auth] refresh failure #${consecutiveRefreshFailures}/${REFRESH_FAILURE_THRESHOLD} (${reason})`
  );
  if (consecutiveRefreshFailures < REFRESH_FAILURE_THRESHOLD) return;
  await notifyForcedLogout();
};

const refreshAccessToken = async (): Promise<RefreshResult> => {
  console.log('[refreshAccessToken] ENTERED', {
    loggingOut,
    postLogout,
    hasPromise: !!refreshPromise,
  });

  if (loggingOut) {
    console.log('[refreshAccessToken] → blocked: loggingOut');
    return { token: null };
  }
  if (isPostLogout()) {
    console.log('[refreshAccessToken] → blocked: postLogout');
    return { token: null };
  }
  if (refreshPromise) {
    console.log('[refreshAccessToken] → reusing in-flight promise');
    return refreshPromise;
  }

  refreshPromise = (async (): Promise<RefreshResult> => {
    let failureReason: string | null = null;

    try {
      console.log('[refreshAccessToken] POST /auth/refresh START');
      const res = await rawInstance.post(REFRESH_PATH);
      console.log('[refreshAccessToken] POST /auth/refresh DONE', {
        status: res.status,
        hasToken: !!(res.data?.accessToken ?? res.data?.token),
      });

      const token: string | undefined = res.data?.accessToken ?? res.data?.token;

      if (!token) {
        failureReason = 'refresh returned 200 with no token';
        return { token: null };
      }

      accessToken = token;
      safeSession.set(SK.accessToken, token);

      if (res.data?.accessTokenExpires) {
        accessTokenExpiry = new Date(res.data.accessTokenExpires);
        safeSession.set(SK.accessTokenExpiry, accessTokenExpiry.toISOString());
      } else {
        accessTokenExpiry = null;
        safeSession.remove(SK.accessTokenExpiry);
      }

      consecutiveRefreshFailures = 0;

      return {
        token,
        profile: {
          id: res.data?.id as User['id'] | undefined,
          fullName: res.data?.fullName as string | undefined,
          company: res.data?.company
            ? {
                id: res.data.company.id as Company['id'] | undefined,
                name: res.data.company.name as Company['name'] | undefined,
              }
            : undefined,
          routes: (res.data?.routes ?? []) as NonNullable<User['routes']>,
          locations: (res.data?.locations ?? []) as NonNullable<User['locations']>,
        },
      };
    } catch (err: any) {
      console.log('[refreshAccessToken] POST /auth/refresh FAILED', {
        status: err?.response?.status,
        body: err?.response?.data,
      });
      const status = err?.response?.status;
      failureReason =
        status === 401
          ? 'refresh returned 401'
          : `refresh failed with status ${status ?? 'unknown'}`;
      return { token: null };
    } finally {
      if (failureReason) await recordRefreshFailure(failureReason);
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

    if (loggingOut) {
      console.log('[response interceptor] 401 blocked: loggingOut', original.url);
      return Promise.reject(error);
    }
    if (isPostLogout()) {
      console.log('[response interceptor] 401 blocked: postLogout', original.url);
      return Promise.reject(error);
    }

    if (original.url?.includes(REFRESH_PATH)) {
      console.log('[response interceptor] 401 on refresh path, rejecting', original.url);
      return Promise.reject(error);
    }

    console.log('[response interceptor] 401 → attempting refresh', original.url);

    original._retry = true;
    const result = await refreshAccessToken();

    if (!result.token) {
      accessToken = null;
      accessTokenExpiry = null;
      safeSession.remove(SK.accessToken);
      safeSession.remove(SK.accessTokenExpiry);
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${result.token}`;
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
  console.log('[clearAuthState] CALLED', {
    before_ssKeys: isBrowser() ? Object.keys(sessionStorage) : 'ssr',
  });

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

  console.log('[clearAuthState] DONE — ss cleared');
};

export const getSelectedShop = (): string => safeSession.get(SK.selectedShop) ?? '';

export const setSelectedShopPersisted = (id: string) => {
  if (id) safeSession.set(SK.selectedShop, id);
  else {
    safeSession.remove(SK.selectedShop);
    safeLocal.remove(SK.selectedShop);
  }
};

export const readCachedAuthSnapshot = () => ({
  user: currentUser,
  company: currentCompany,
  selectedShop: getSelectedShop(),
  isAuthenticated:
    !isPostLogout() &&
    hasReconciledWithServer &&
    initialAuthCheckResult === true,
});

// ---------- initial auth check ----------
export const performInitialAuthCheck = async (
  force: boolean = false,
  setUser?: React.Dispatch<React.SetStateAction<Partial<User>>>,
  setCompany?: React.Dispatch<React.SetStateAction<Partial<Company>>>
): Promise<boolean> => {
  console.log('[performInitialAuthCheck] ENTERED', {
    postLogout,
    ss_justLoggedOut: isBrowser() ? safeSession.get(SK.justLoggedOut) : 'ssr',
    hasReconciledWithServer,
    initialAuthCheckResult,
    force,
    hasToken: !!accessToken,
  });

  if (setUser && setCompany) registerAuthSetters(setUser, setCompany);

  if (isPostLogout()) {
    console.log('[performInitialAuthCheck] → POST-LOGOUT GATE (return false)');
    initialAuthCheckDone = true;
    initialAuthCheckResult = false;
    hasReconciledWithServer = true;
    initialAuthCheckPromise = null;
    return false;
  }

  if (!force && hasReconciledWithServer && initialAuthCheckResult === true) {
    console.log('[performInitialAuthCheck] → CACHE HIT (return true)');
    return true;
  }

  if (!force && initialAuthCheckPromise) {
    console.log('[performInitialAuthCheck] → AWAITING IN-FLIGHT PROMISE');
    return initialAuthCheckPromise;
  }

  console.log('[performInitialAuthCheck] → CALLING refreshAccessToken');

  initialAuthCheckPromise = (async () => {
    try {
      const result = await refreshAccessToken();

      if (!result.token || !result.profile) {
        console.log('[performInitialAuthCheck] refresh returned no token/profile');
        initialAuthCheckDone = true;
        initialAuthCheckResult = false;
        hasReconciledWithServer = true;
        initialAuthCheckPromise = null;
        return false;
      }

      const data = result.profile;
      const fullName = data.fullName || '';
      const nameParts = fullName.split(' ').filter(Boolean);

      const userData: Partial<User> = {
        lastName: nameParts[nameParts.length - 1] || '',
        firstName: nameParts[0] || '',
        id: data.id,
        companyId: data.company?.id,
        routes: data.routes || [],
        locations: data.locations || [],
      };

      const companyData: Partial<Company> = {
        id: data.company?.id,
        name: data.company?.name,
      };

      updateAuthState(userData, companyData);
      safeSession.set(SK.isAuthenticated, 'true');
      consecutiveRefreshFailures = 0;

      initialAuthCheckDone = true;
      initialAuthCheckResult = true;
      hasReconciledWithServer = true;
      initialAuthCheckPromise = null;
      console.log('[performInitialAuthCheck] → SUCCESS (return true)');
      return true;
    } catch (error: any) {
      console.error('[auth] initial check failed:', error?.message);
      initialAuthCheckDone = true;
      initialAuthCheckResult = false;
      hasReconciledWithServer = true;
      initialAuthCheckPromise = null;
      console.log('[performInitialAuthCheck] → ERROR (return false)');
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
  if (!accessTokenExpiry) return !accessToken;
  return new Date() >= new Date(accessTokenExpiry.getTime() - 30 * 1000);
};

export const getAuthState = () => ({
  isAuthenticated:
    !isPostLogout() &&
    hasReconciledWithServer &&
    initialAuthCheckResult === true &&
    !!accessToken &&
    !isAccessTokenExpired(),
  user: currentUser,
  company: currentCompany,
  initialAuthCheckDone,
  isRefreshing: refreshPromise !== null,
});

// ---------- login ----------
export const login = async (email: string, password: string): Promise<any> => {
  // console.log('[login] ENTERED');
  loggingOut = false;
  clearPostLogout();

  const response = await rawInstance.post('/auth/login', { email, password });
  const data = response.data;

  if (!data || typeof data !== 'object' || !data.id) {
    // console.error('[login] unexpected response body', { status: response.status, data });
    throw new Error(
      'Login succeeded but the server response was missing required fields. ' +
      'Check the network tab for the /auth/login response body.'
    );
  }

  if (data.accessToken) {
    accessToken = data.accessToken;
    safeSession.set(SK.accessToken, accessToken!);
    if (data.accessTokenExpires) {
      accessTokenExpiry = new Date(data.accessTokenExpires);
      safeSession.set(SK.accessTokenExpiry, accessTokenExpiry.toISOString());
    } else {
      accessTokenExpiry = null;
      safeSession.remove(SK.accessTokenExpiry);
    }
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
  };

  const companyData: Partial<Company> = {
    id: data.company?.id,
    name: data.company?.name,
  };

  updateAuthState(userData, companyData);

  initialAuthCheckDone = true;
  initialAuthCheckResult = true;
  hasReconciledWithServer = true;

  // console.log('[login] DONE', { postLogout, loggingOut });
  return data;
};

// ---------- logout ----------
export const logout = async (): Promise<void> => {
  // console.log('[logout] ENTERED', {
  //   loggingOut,
  //   postLogout,
  //   ss_justLoggedOut: isBrowser() ? safeSession.get(SK.justLoggedOut) : 'ssr',
  //   ss_accessToken: isBrowser() ? safeSession.get(SK.accessToken) : 'ssr',
  // });

  if (loggingOut) {
    // console.log('[logout] already in progress, bailing');
    return;
  }
  loggingOut = true;

  markPostLogout();
  // console.log('[logout] markPostLogout() set — postLogout = true, ss = "1"');

  try {
    // console.log('[logout] POST /auth/logout START');
    await rawInstance.post('/auth/logout');
    // console.log('[logout] POST /auth/logout DONE');
  } catch (err) {
    console.warn('[auth] logout endpoint failed (ignored):', err);
  } finally {
    clearAuthState();
    markPostLogout();   // re-set after clearAuthState wiped sessionStorage
    loggingOut = false;
    // console.log('[logout] EXITED', {
    //   postLogout,
    //   ss_justLoggedOut: isBrowser() ? safeSession.get(SK.justLoggedOut) : 'ssr',
    // });
  }
};

export default axiosInstance;
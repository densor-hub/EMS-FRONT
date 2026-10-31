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
const REFRESH_FAILURE_THRESHOLD = 2;

// ---------- forced-logout signal ----------
type ForcedLogoutListener = () => void | Promise<void>;
const forcedLogoutListeners = new Set<ForcedLogoutListener>();

export const onForcedLogout = (listener: ForcedLogoutListener): (() => void) => {
  forcedLogoutListeners.add(listener);
  return () => {
    forcedLogoutListeners.delete(listener);
  };
};

const notifyForcedLogout = async (): Promise<void> => {
  const listeners = Array.from(forcedLogoutListeners);
  for (const listener of listeners) {
    try {
      await listener();
    } catch (err) {
      console.error('[auth] forced-logout listener failed:', err);
    }
  }
};

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

// ---------- refresh ----------
type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthCheck?: boolean;
  _skipRefresh?: boolean;
};

// ✅ Type `profile` to match `Partial<User>` and `Partial<Company>` exactly.
// No hard-coded `number` — whatever your `@/lib/types` declares for
// `User['id']`, `User['companyId']`, `Company['id']`, `Company['name']`,
// `User['routes']`, `User['locations']` is what this uses.
type RefreshResult = {
  token: string | null;
  profile?: {
    id?: User['id'];
    fullName?: string;
    company?: {
      id?: Company['id'];
      name?: Company['name'];
    };
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
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<RefreshResult> => {
    let failureReason: string | null = null;

    try {
      const res = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const token: string | undefined =
        res.data?.accessToken ?? res.data?.token;

      if (!token) {
        failureReason = 'refresh returned 200 with no token';
        return { token: null };
      }

      accessToken = token;
      if (res.data?.accessTokenExpires) {
        accessTokenExpiry = new Date(res.data.accessTokenExpires);
      }
      safeSession.set(SK.accessToken, token);

      // res.data is `any`; the casts narrow it to the exact field types
      // declared in RefreshResult. Nothing here is invented — every field
      // is the same one your backend has always returned.
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
          locations: (res.data?.locations ?? []) as NonNullable<
            User['locations']
          >,
        },
      };
    } catch (err: any) {
      const status = err?.response?.status;
      failureReason =
        status === 401
          ? 'refresh returned 401'
          : `refresh failed with status ${status ?? 'unknown'}`;
      return { token: null };
    } finally {
      if (failureReason) {
        await recordRefreshFailure(failureReason);
        refreshPromise = null;
      } else {
        setTimeout(() => {
          refreshPromise = null;
        }, 150);
      }
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

    if (original.url?.includes('/auth/refresh')) {
      await recordRefreshFailure(`direct 401 on ${original.url}`);
      return Promise.reject(error);
    }

    original._retry = true;

    const result = await refreshAccessToken();

    if (!result.token) {
      accessToken = null;
      accessTokenExpiry = null;
      safeSession.remove(SK.accessToken);
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
      const result = await refreshAccessToken();

      if (!result.token || !result.profile) {
        initialAuthCheckDone = true;
        initialAuthCheckResult = false;
        hasReconciledWithServer = true;
        initialAuthCheckPromise = null;
        return false;
      }

      const data = result.profile;
      const fullName = data.fullName || '';
      const nameParts = fullName.split(' ').filter(Boolean);

      // ✅ These now compile without casts — `data.id` is `User['id']`,
      // `data.company?.id` is `Company['id']` (which should equal
      // `User['companyId']` in your types).
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
      return true;
    } catch (error: any) {
      console.error('[auth] initial check failed:', error?.message);

      initialAuthCheckDone = true;
      initialAuthCheckResult = false;
      hasReconciledWithServer = true;
      initialAuthCheckPromise = null;

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
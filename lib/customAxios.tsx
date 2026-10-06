// lib/customAxios.ts
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { Company, User } from './types';

//const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7214';
const baseURL = '/api'

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

// ---------- module state ----------
let isRefreshing = false;
let accessToken: string | null = null;
let accessTokenExpiry: Date | null = null;
let currentUser: Partial<User> = {};
let currentCompany: Partial<Company> = {};

let initialAuthCheckDone = false;
let initialAuthCheckPromise: Promise<boolean> | null = null;
let initialAuthCheckResult: boolean | null = null;

let userStateSetter: ((user: Partial<User>) => void) | null = null;
let companyStateSetter: ((company: Partial<Company>) => void) | null = null;

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

// ---------- refresh + queue ----------
type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthCheck?: boolean;
  _skipRefresh?: boolean;
};

const pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  while (pendingQueue.length) {
    const cb = pendingQueue.shift();
    try {
      cb?.(token);
    } catch {
      /* noop */
    }
  }
}

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
        safeSession.set('accessToken', token);
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

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(axiosInstance(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const token = await refreshAccessToken();
      flushQueue(token);

      if (!token) throw error;
      original.headers.Authorization = `Bearer ${token}`;
      return axiosInstance(original);
    } catch (refreshErr) {
      flushQueue(null);
      accessToken = null;
      accessTokenExpiry = null;
      safeSession.remove('accessToken');
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
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
    userStateSetter?.(currentUser);
  }
  if (company && Object.keys(company).length > 0) {
    currentCompany = { ...currentCompany, ...company };
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

  safeSession.clear();
  safeLocal.clear();

  userStateSetter?.({});
  companyStateSetter?.({});
};

// ---------- initial auth check ----------
export const performInitialAuthCheck = async (
  setUser?: React.Dispatch<React.SetStateAction<Partial<User>>>,
  setCompany?: React.Dispatch<React.SetStateAction<Partial<Company>>>
): Promise<boolean> => {
  if (setUser && setCompany) registerAuthSetters(setUser, setCompany);

  if (initialAuthCheckResult === true) return true;
  if (initialAuthCheckPromise) return initialAuthCheckPromise;

  initialAuthCheckPromise = (async () => {
    try {
      const response = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const fullName = response?.data?.fullName || '';
      const nameParts = fullName.split(' ');
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
        safeSession.set('accessToken', accessToken??"");
      }

      updateAuthState(userData, companyData);
      safeSession.set('isAuthenticated', 'true');

      initialAuthCheckDone = true;
      initialAuthCheckResult = true;
      return true;
    } catch (error: any) {
      console.error('[auth] initial check failed:', error?.message);

      // Do NOT call clearAuthState here — a transient failure shouldn't wipe
      // local state and trigger a phantom logout.
      initialAuthCheckDone = true;
      initialAuthCheckResult = false;
      return false;
    }
  })();

  return initialAuthCheckPromise;
};

export const resetAuthCheck = () => {
  initialAuthCheckDone = false;
  initialAuthCheckPromise = null;
  initialAuthCheckResult = null;
};

export const isAccessTokenExpired = (): boolean => {
  if (!accessTokenExpiry) return true;
  return new Date() >= new Date(accessTokenExpiry.getTime() - 30 * 1000);
};

export const getAuthState = () => ({
  isAuthenticated:
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

    if (response.data.accessToken) {
      accessToken = response.data.accessToken;
      accessTokenExpiry = new Date(response.data.accessTokenExpires);
      safeSession.set('accessToken', accessToken??"");
    }

    if (response.data.user) {
      updateAuthState(response.data.user, response.data.company);
    }

    // Cache success so the next page's performInitialAuthCheck short-circuits
    initialAuthCheckResult = true;
    initialAuthCheckDone = true;
    initialAuthCheckPromise = Promise.resolve(true);

    safeSession.set('isAuthenticated', 'true');

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
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as authApi from '../api/auth';
import { ApiError, configureApiAuth } from '../api/client';
import type { User } from '../api/types';

const ACCESS_KEY = 'voidcat.access_token';
const REFRESH_KEY = 'voidcat.refresh_token';
const USER_KEY = 'voidcat.user';

type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthValue {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    company?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Best-effort write to the keychain. A storage failure must not fail an
 * otherwise-successful sign-in: the session is already live in memory, and the
 * only cost of a failed write is having to sign in again next launch.
 */
async function persist(key: string, value: string | null) {
  try {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (err) {
    console.warn(`[auth] could not persist ${key}`, err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  // Held in a ref so the API client can read the current token synchronously
  // without every request re-subscribing to React state.
  const accessToken = useRef<string | null>(null);
  const refreshToken = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    accessToken.current = null;
    refreshToken.current = null;
    setUser(null);
    setStatus('signedOut');
    await Promise.all([
      persist(ACCESS_KEY, null),
      persist(REFRESH_KEY, null),
      persist(USER_KEY, null),
    ]);
  }, []);

  const storeSession = useCallback(
    async (tokens: { access_token: string; refresh_token?: string }, nextUser: User) => {
      accessToken.current = tokens.access_token;
      if (tokens.refresh_token) refreshToken.current = tokens.refresh_token;
      setUser(nextUser);
      setStatus('signedIn');
      await Promise.all([
        persist(ACCESS_KEY, tokens.access_token),
        tokens.refresh_token ? persist(REFRESH_KEY, tokens.refresh_token) : Promise.resolve(),
        persist(USER_KEY, JSON.stringify(nextUser)),
      ]);
    },
    [],
  );

  const tryRefresh = useCallback(async () => {
    if (!refreshToken.current) return false;
    try {
      const result = await authApi.refresh(refreshToken.current);
      accessToken.current = result.access_token;
      await persist(ACCESS_KEY, result.access_token);
      const profile = await authApi.me();
      setUser(profile.user);
      await persist(USER_KEY, JSON.stringify(profile.user));
      setStatus('signedIn');
      return true;
    } catch {
      return false;
    }
  }, []);

  // Restore a previous session, then verify it is still valid.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [storedAccess, storedRefresh, storedUser] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_KEY),
          SecureStore.getItemAsync(REFRESH_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (cancelled) return;

        if (!storedAccess || !storedUser) {
          setStatus('signedOut');
          return;
        }

        accessToken.current = storedAccess;
        refreshToken.current = storedRefresh;
        setUser(JSON.parse(storedUser) as User);
        setStatus('signedIn');

        // Confirm the token still works; a stale one is swapped via refresh.
        try {
          const result = await authApi.me();
          if (!cancelled) setUser(result.user);
        } catch {
          if (cancelled) return;
          const recovered = await tryRefresh();
          if (!recovered && !cancelled) await clearSession();
        }
      } catch {
        if (!cancelled) setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tryRefresh, clearSession]);

  // Give the API client access to the token and a hook for expired sessions.
  useEffect(() => {
    configureApiAuth(
      () => accessToken.current,
      async () => {
        const recovered = await tryRefresh();
        if (!recovered) await clearSession();
      },
    );
  }, [tryRefresh, clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email.trim(), password);
      await storeSession(result, result.user);
    },
    [storeSession],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; name: string; company?: string }) => {
      const result = await authApi.register({ ...input, email: input.email.trim() });
      await storeSession(result, result.user);
    },
    [storeSession],
  );

  const refreshUser = useCallback(async () => {
    try {
      const result = await authApi.me();
      setUser(result.user);
      await persist(USER_KEY, JSON.stringify(result.user));
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) return; // handled by the client hook
      throw err;
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, signIn, signUp, signOut: clearSession, refreshUser }),
    [status, user, signIn, signUp, clearSession, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function isPaidTier(user: User | null) {
  const tier = user?.subscription_tier?.toLowerCase();
  return tier !== undefined && tier !== 'free';
}

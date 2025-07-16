/*
 * Auth API wrapper
 * ----------------
 * Provides typed helper functions for calling backend authentication endpoints
 * and storing the JWT access token for Socket.io and REST requests.
 * Now integrates with Zustand connection store for centralized state management.
 */

import axios from 'axios';
import { connectionStore } from '@/state/connectionStore';

/**
 * Backend base URL (REST). Defaults to localhost when env var not provided.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Local-storage key for the access JWT.
 */
const TOKEN_STORAGE_KEY = 'brawlbytes_access_token';

/* ------------------------------------------------------------------ */
/* Types                                                             */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthSuccess {
  success: true;
  token: string;
  user: User;
}

export interface AuthFailure {
  success: false;
  message: string;
}

export type AuthResponse = AuthSuccess | AuthFailure;

/* ------------------------------------------------------------------ */
/* Token helpers                                                     */
/* ------------------------------------------------------------------ */

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  // Also update the connection store
  const store = connectionStore.getState();
  store.setAuthData(token, store.userId);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);

  // Also clear from connection store
  const store = connectionStore.getState();
  store.setAuthData(null, null);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/* API calls                                                         */
/* ------------------------------------------------------------------ */

/**
 * Register a new user account.
 */
export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password,
    });

    if (res.data?.success && res.data.data?.token) {
      const { token } = res.data.data;
      storeToken(token);
      return {
        success: true,
        token,
        user: res.data.data.user as User,
      };
    }

    return {
      success: false,
      message: res.data?.message || 'Registration failed',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Log in with username/email + password.
 */
export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password,
    });

    if (res.data?.success && res.data.data?.token) {
      const { token } = res.data.data;
      storeToken(token);
      return {
        success: true,
        token,
        user: res.data.data.user as User,
      };
    }

    return {
      success: false,
      message: res.data?.message || 'Login failed',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Refresh the access token via /auth/refresh using current token.
 */
export async function refreshToken(): Promise<AuthResponse> {
  const token = getStoredToken();
  if (!token) {
    return { success: false, message: 'No stored token' };
  }

  try {
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.data?.success && res.data.data?.token) {
      const newToken: string = res.data.data.token;
      storeToken(newToken);
      return {
        success: true,
        token: newToken,
        user: res.data.data.user as User | undefined, // may not include user
      } as AuthSuccess;
    }

    return {
      success: false,
      message: res.data?.message || 'Refresh failed',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.message || err.message,
    };
  }
}

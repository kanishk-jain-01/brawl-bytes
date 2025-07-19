/*
 * Shared Authentication Types
 * ---------------------------
 * Common authentication-related type definitions used by both frontend and backend.
 * These types ensure consistent authentication contracts across the application.
 */

export interface AuthRequest {
  token: string;
}

export interface AuthResponse {
  success: boolean;
  userId?: string;
  username?: string;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

// User authentication state
export interface AuthUser {
  userId: string;
  username: string;
  isAuthenticated: boolean;
}

// Authentication status for client-side state management
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { TokenPayload } from '../types';

export interface JWTPayload extends TokenPayload {
  email: string;
}

/**
 * Get JWT secret from environment variable
 * Throws error if not set to prevent security vulnerabilities
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required for security. Cannot start server without it.'
    );
  }
  return secret;
}

export const generateToken = (payload: JWTPayload): string => {
  const secret = getJWTSecret();
  return jwt.sign(payload as any, secret, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret = getJWTSecret();
  return jwt.sign(payload as any, secret, { expiresIn: '30d' });
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
};

export const validatePasswordStrength = (
  password: string
): { valid: boolean; message?: string } => {
  if (password.length < 1) {
    return {
      valid: false,
      message: 'Password cannot be empty',
    };
  }

  return { valid: true };
};

export const validatePassword = (password: string): boolean => {
  return validatePasswordStrength(password).valid;
};

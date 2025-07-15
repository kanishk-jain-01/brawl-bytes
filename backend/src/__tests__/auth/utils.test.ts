import {
  generateToken,
  generateRefreshToken,
  hashPassword,
  verifyPassword,
  validateEmail,
  validateUsername,
  validatePasswordStrength,
  validatePassword,
} from '../../auth/utils';
import jwt from 'jsonwebtoken';

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;
mockJwt.sign = jest.fn().mockReturnValue('mocked-token');
mockJwt.verify = jest.fn();

describe('Auth Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload and expiration', () => {
      const payload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      };


      const token = generateToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '15m' }
      );
      expect(token).toBe('mocked-token');
    });

    it('should use fallback secret if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      
      const payload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      };


      generateToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'fallback_secret',
        { expiresIn: '15m' }
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with 30 day expiration', () => {
      const payload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      };

      const token = generateRefreshToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '30d' }
      );
      expect(token).toBe('mocked-token');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'testpassword';
      
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2b\$12\$/); // bcrypt format with 12 rounds
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testpassword';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testpassword';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      
      expect(isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user.domain.com',
        'user@domain',
        '',
        'user space@domain.com',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validateUsername', () => {
    it('should return true for valid usernames', () => {
      const validUsernames = [
        'user',
        'test_user',
        'User123',
        'user_name_123',
        'a'.repeat(50), // max length
      ];

      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true);
      });
    });

    it('should return false for invalid usernames', () => {
      const invalidUsernames = [
        'ab', // too short
        'a'.repeat(51), // too long
        'user-name', // contains dash
        'user name', // contains space
        'user@name', // contains special character
        'user.name', // contains dot
        '',
      ];

      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false);
      });
    });
  });

  describe('validatePasswordStrength', () => {
    it('should return valid for strong passwords', () => {
      const strongPasswords = [
        'Password123',
        'MyStr0ngP@ss',
        'Valid123Pass',
        'Test1234',
      ];

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });
    });

    it('should return invalid for passwords too short', () => {
      const shortPassword = '1234567'; // 7 characters

      const result = validatePasswordStrength(shortPassword);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must be at least 8 characters long');
    });

    it('should return invalid for passwords without lowercase', () => {
      const password = 'PASSWORD123';

      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one lowercase letter');
    });

    it('should return invalid for passwords without uppercase', () => {
      const password = 'password123';

      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one uppercase letter');
    });

    it('should return invalid for passwords without numbers', () => {
      const password = 'PasswordOnly';

      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one number');
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid passwords', () => {
      const validPasswords = [
        'Password123',
        'ValidPass1',
        'MyStr0ngPassword',
      ];

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    it('should return false for invalid passwords', () => {
      const invalidPasswords = [
        'weak',
        'PASSWORD123',
        'password123',
        'PasswordOnly',
      ];

      invalidPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false);
      });
    });
  });
});
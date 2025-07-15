import {
  validateEmail,
  validateUsername,
  validatePasswordStrength,
  validatePassword,
  hashPassword,
  verifyPassword,
} from '../../auth/utils';

describe('Auth Utils - Basic Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('user')).toBe(true);
      expect(validateUsername('test_user')).toBe(true);
      expect(validateUsername('User123')).toBe(true);
      expect(validateUsername('user_name_123')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false); // too short
      expect(validateUsername('a'.repeat(51))).toBe(false); // too long
      expect(validateUsername('user-name')).toBe(false); // contains dash
      expect(validateUsername('user name')).toBe(false); // contains space
      expect(validateUsername('')).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      const result1 = validatePasswordStrength('Password123');
      expect(result1.valid).toBe(true);
      expect(result1.message).toBeUndefined();

      const result2 = validatePasswordStrength('MyStr0ngP@ss');
      expect(result2.valid).toBe(true);
      expect(result2.message).toBeUndefined();
    });

    it('should reject passwords that are too short', () => {
      const result = validatePasswordStrength('Pass123');
      expect(result.valid).toBe(false);
      expect(result.message).toBe(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePasswordStrength('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.message).toBe(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePasswordStrength('password123');
      expect(result.valid).toBe(false);
      expect(result.message).toBe(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength('PasswordOnly');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one number');
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid passwords', () => {
      expect(validatePassword('Password123')).toBe(true);
      expect(validatePassword('ValidPass1')).toBe(true);
      expect(validatePassword('MyStr0ngPassword')).toBe(true);
    });

    it('should return false for invalid passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('PASSWORD123')).toBe(false);
      expect(validatePassword('password123')).toBe(false);
      expect(validatePassword('PasswordOnly')).toBe(false);
    });
  });

  describe('password hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2b\$12\$/); // bcrypt format with 12 rounds
    });

    it('should verify passwords correctly', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });
});

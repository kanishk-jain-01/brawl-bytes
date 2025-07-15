import { PrismaClient } from '@prisma/client';
import {
  UserRepository,
  CreateUserData,
} from '../../database/repositories/UserRepository';

// Mock Prisma Client
jest.mock('@prisma/client');

describe('UserRepository', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    (mockPrisma as any).user = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with hashed password and player profile', async () => {
      const userData: CreateUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: {
          userId: 'test-user-id',
          level: 1,
          experiencePoints: 0,
          rating: 1000,
          totalMatches: 0,
          wins: 0,
          losses: 0,
        },
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await UserRepository.createUser(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash: expect.any(String),
          playerProfile: {
            create: {
              level: 1,
              experiencePoints: 0,
              rating: 1000,
              totalMatches: 0,
              wins: 0,
              losses: 0,
            },
          },
        },
        include: {
          playerProfile: true,
        },
      });

      expect(result).toEqual(mockUser);
    });

    it('should hash the password before storing', async () => {
      const userData: CreateUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: null,
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      await UserRepository.createUser(userData);

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe(userData.password);
      expect(createCall.data.passwordHash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when username exists', async () => {
      const username = 'testuser';
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: {
          userId: 'test-user-id',
          level: 1,
          experiencePoints: 0,
          rating: 1000,
          totalMatches: 0,
          wins: 0,
          losses: 0,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserRepository.getUserByUsername(username);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username },
        include: { playerProfile: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when username does not exist', async () => {
      const username = 'nonexistent';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserRepository.getUserByUsername(username);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when email exists', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserRepository.getUserByEmail(email);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { playerProfile: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when email does not exist', async () => {
      const email = 'nonexistent@example.com';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserRepository.getUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when id exists', async () => {
      const userId = 'test-user-id';
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserRepository.getUserById(userId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { playerProfile: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login timestamp', async () => {
      const userId = 'test-user-id';
      const mockUpdatedUser = {
        id: userId,
        lastLogin: new Date(),
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      await UserRepository.updateLastLogin(userId);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLogin: expect.any(Date) },
      });
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'Password123';
      const hashedPassword =
        '$2b$12$ThvmYdVDiI2uscizV.93HuBbKDcsp5M/iuO5rSapE6uD2/Qk1mWC.'; // bcrypt hash of "Password123"

      const result = await UserRepository.verifyPassword(
        password,
        hashedPassword
      );

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'WrongPassword';
      const hashedPassword =
        '$2b$12$ThvmYdVDiI2uscizV.93HuBbKDcsp5M/iuO5rSapE6uD2/Qk1mWC.'; // bcrypt hash of "Password123"

      const result = await UserRepository.verifyPassword(
        password,
        hashedPassword
      );

      expect(result).toBe(false);
    });
  });
});

import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth';
import { UserRepository } from '../../database/repositories/UserRepository';
import { generateToken } from '../../auth/utils';

// Mock dependencies
jest.mock('../../database/repositories/UserRepository');
jest.mock('../../auth/utils');
jest.mock('../../auth/middleware');

const mockUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;
const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;

// Mock the auth middleware
const mockAuthMiddleware = jest.fn((req: any, res: any, next: any) => {
  req.user = { userId: 'test-user-id', username: 'testuser', email: 'test@example.com' };
  next();
});

jest.mock('../../auth/middleware', () => ({
  authenticateJWT: jest.fn(() => mockAuthMiddleware),
}));

// Setup test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
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

      mockUserRepository.getUserByUsername.mockResolvedValue(null);
      mockUserRepository.getUserByEmail.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            playerProfile: mockUser.playerProfile,
          },
          token: 'mock-jwt-token',
        },
      });

      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userData);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Username, email, and password are required',
      });
    });

    it('should return 400 for invalid username format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'a', // too short
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Username must be 3-50 characters');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email format',
      });
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password must be at least 8 characters');
    });

    it('should return 409 for existing username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'Password123',
      };

      const existingUser = {
        id: 'existing-user-id',
        username: 'existinguser',
        email: 'existing@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: null,
      };

      mockUserRepository.getUserByUsername.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Username already exists',
      });
    });

    it('should return 409 for existing email', async () => {
      const userData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password123',
      };

      const existingUser = {
        id: 'existing-user-id',
        username: 'differentuser',
        email: 'existing@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        playerProfile: null,
      };

      mockUserRepository.getUserByUsername.mockResolvedValue(null);
      mockUserRepository.getUserByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Email already exists',
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
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

      mockUserRepository.getUserByUsername.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue();
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            playerProfile: mockUser.playerProfile,
          },
          token: 'mock-jwt-token',
        },
      });

      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should login user with email instead of username', async () => {
      const loginData = {
        username: 'test@example.com', // using email as username
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

      mockUserRepository.getUserByUsername.mockResolvedValue(null);
      mockUserRepository.getUserByEmail.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue();
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Username and password are required',
      });
    });

    it('should return 401 for invalid username', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'Password123',
      };

      mockUserRepository.getUserByUsername.mockResolvedValue(null);
      mockUserRepository.getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'WrongPassword',
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

      mockUserRepository.getUserByUsername.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials',
      });
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        playerProfile: {
          userId: 'test-user-id',
          level: 5,
          experiencePoints: 1500,
          rating: 1200,
          totalMatches: 20,
          wins: 12,
          losses: 8,
        },
      };

      mockUserRepository.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/auth/profile')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            createdAt: mockUser.createdAt,
            lastLogin: mockUser.lastLogin,
            playerProfile: mockUser.playerProfile,
          },
        },
      });
    });

    it('should return 404 if user not found', async () => {
      mockUserRepository.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/profile')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found',
      });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token for authenticated user', async () => {
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

      mockUserRepository.getUserById.mockResolvedValue(mockUser);
      mockGenerateToken.mockReturnValue('new-jwt-token');

      const response = await request(app)
        .post('/auth/refresh')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: 'new-jwt-token',
        },
      });
    });

    it('should return 401 if user not found during refresh', async () => {
      mockUserRepository.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found',
      });
    });
  });
});
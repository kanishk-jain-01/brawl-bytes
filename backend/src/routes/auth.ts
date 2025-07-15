import express from 'express';
import { UserRepository } from '../database/repositories/UserRepository';
import { generateToken, validateEmail, validateUsername, validatePasswordStrength } from '../auth/utils';
import { authenticateJWT, AuthenticatedRequest } from '../auth/middleware';

const router = express.Router();

// POST /auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required' 
      });
    }

    // Validate format
    if (!validateUsername(username)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be 3-50 characters and contain only letters, numbers, and underscores' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: passwordValidation.message 
      });
    }

    // Check if user already exists
    const existingUserByUsername = await UserRepository.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    const existingUserByEmail = await UserRepository.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Create user
    const user = await UserRepository.createUser({
      username,
      email,
      password,
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          playerProfile: user.playerProfile,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// POST /auth/login - User authentication
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user by username or email
    let user = await UserRepository.getUserByUsername(username);
    if (!user) {
      user = await UserRepository.getUserByEmail(username);
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await UserRepository.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    await UserRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          playerProfile: user.playerProfile,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// POST /auth/refresh - JWT token refresh
router.post('/refresh', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    // Verify user still exists
    const user = await UserRepository.getUserById(userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate new token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// GET /auth/profile - Get current user profile
router.get('/profile', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    const user = await UserRepository.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          playerProfile: user.playerProfile,
        },
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
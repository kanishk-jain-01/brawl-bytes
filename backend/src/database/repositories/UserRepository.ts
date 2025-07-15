import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
}

export interface UserWithProfile {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  playerProfile: {
    userId: string;
    level: number;
    experiencePoints: number;
    rating: number;
    totalMatches: number;
    wins: number;
    losses: number;
  } | null;
}

export class UserRepository {
  static async createUser(userData: CreateUserData): Promise<UserWithProfile> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
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

    return user;
  }

  static async getUserByUsername(
    username: string
  ): Promise<UserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        playerProfile: true,
      },
    });

    return user;
  }

  static async getUserByEmail(email: string): Promise<UserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        playerProfile: true,
      },
    });

    return user;
  }

  static async getUserById(id: string): Promise<UserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        playerProfile: true,
      },
    });

    return user;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

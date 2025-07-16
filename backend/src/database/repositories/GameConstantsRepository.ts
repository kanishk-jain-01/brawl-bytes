import { PrismaClient } from '@prisma/client';

export class GameConstantsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get all active game constants
   */
  async getAllConstants() {
    return this.prisma.gameConstants.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get constants by category
   */
  async getConstantsByCategory(category: string) {
    return this.prisma.gameConstants.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a specific constant by category and name
   */
  async getConstant(category: string, name: string) {
    return this.prisma.gameConstants.findUnique({
      where: {
        category_name: { category, name },
        isActive: true,
      },
    });
  }

  /**
   * Get constants formatted for client consumption
   */
  async getFormattedConstants() {
    const constants = await this.getAllConstants();

    const formatted: Record<string, Record<string, any>> = {};

    constants.forEach((constant: any) => {
      if (!formatted[constant.category]) {
        formatted[constant.category] = {};
      }

      // For now, use flat structure to avoid conflicts
      // We can enhance this later if needed for specific nested paths
      formatted[constant.category][constant.name] = constant.value;
    });

    return formatted;
  }

  /**
   * Update a game constant value
   */
  async updateConstant(category: string, name: string, value: any) {
    return this.prisma.gameConstants.update({
      where: {
        category_name: { category, name },
      },
      data: {
        value,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Create a new game constant
   */
  async createConstant(data: {
    id: string;
    category: string;
    name: string;
    description?: string;
    value: any;
    dataType: string;
  }) {
    return this.prisma.gameConstants.create({
      data,
    });
  }
}

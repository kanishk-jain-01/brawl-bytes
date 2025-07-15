import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { GameConstantsRepository } from '../database/repositories/GameConstantsRepository';

const prisma = new PrismaClient();
const gameConstantsRepo = new GameConstantsRepository(prisma);

/**
 * Get all game constants formatted for client use
 */
export const getAllConstants = async (_req: Request, res: Response) => {
  try {
    const constants = await gameConstantsRepo.getFormattedConstants();

    res.json({
      success: true,
      data: constants,
    });
  } catch (error) {
    console.error('Error fetching game constants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game constants',
    });
  }
};

/**
 * Get constants by category
 */
export const getConstantsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    if (!category) {
      res.status(400).json({
        success: false,
        error: 'Category parameter is required',
      });
      return;
    }

    const constants = await gameConstantsRepo.getConstantsByCategory(category);

    // Format for client
    const formatted: Record<string, any> = {};
    constants.forEach((constant: any) => {
      formatted[constant.name] = constant.value;
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching constants by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch constants by category',
    });
  }
};

/**
 * Get a specific constant
 */
export const getConstant = async (req: Request, res: Response) => {
  try {
    const { category, name } = req.params;

    if (!category || !name) {
      res.status(400).json({
        success: false,
        error: 'Category and name parameters are required',
      });
      return;
    }

    const constant = await gameConstantsRepo.getConstant(category, name);

    if (!constant) {
      res.status(404).json({
        success: false,
        error: 'Constant not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        name: constant.name,
        value: constant.value,
        description: constant.description,
      },
    });
  } catch (error) {
    console.error('Error fetching specific constant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch constant',
    });
  }
};

/**
 * Update a game constant (admin only - will add auth later)
 */
export const updateConstant = async (req: Request, res: Response) => {
  try {
    const { category, name } = req.params;
    const { value } = req.body;

    if (!category || !name || value === undefined) {
      res.status(400).json({
        success: false,
        error: 'Category, name, and value are required',
      });
      return;
    }

    const updatedConstant = await gameConstantsRepo.updateConstant(
      category,
      name,
      value
    );

    res.json({
      success: true,
      data: {
        name: updatedConstant.name,
        value: updatedConstant.value,
        updatedAt: updatedConstant.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating constant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update constant',
    });
  }
};

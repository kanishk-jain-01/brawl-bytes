import { Router } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/characters
 * Get all available characters
 */
router.get('/', async (_req, res) => {
  try {
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch characters'
    });
  }
});

/**
 * GET /api/characters/:id
 * Get a specific character by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const character = await prisma.character.findUnique({
      where: { 
        id,
        isActive: true 
      }
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    return res.json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch character'
    });
  }
});

export default router;
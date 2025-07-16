import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/stages
 * Get all available stages
 */
router.get('/', async (_req, res) => {
  try {
    const stages = await prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json(stages);
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stages',
    });
  }
});

/**
 * GET /api/stages/:id
 * Get a specific stage by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const stage = await prisma.stage.findUnique({
      where: {
        id,
        isActive: true,
      },
    });

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    return res.json(stage);
  } catch (error) {
    console.error('Error fetching stage:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stage',
    });
  }
});

export default router;

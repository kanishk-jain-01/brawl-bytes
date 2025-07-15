import { Router } from 'express';
import {
  getAllConstants,
  getConstantsByCategory,
  getConstant,
  updateConstant,
} from '../controllers/gameConstantsController';

const router = Router();

// GET /api/constants - Get all game constants
router.get('/', getAllConstants);

// GET /api/constants/:category - Get constants by category (physics, combat, game)
router.get('/:category', getConstantsByCategory);

// GET /api/constants/:category/:name - Get a specific constant
router.get('/:category/:name', getConstant);

// PUT /api/constants/:category/:name - Update a constant (admin only - will add auth later)
router.put('/:category/:name', updateConstant);

export default router;

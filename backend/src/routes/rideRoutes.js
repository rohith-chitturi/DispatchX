import { Router } from 'express';
import { RideController } from '../controllers/RideController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// ==========================================
// RIDE ROUTES
// ==========================================

// POST /api/rides/request
// Requires JWT Authorization
router.post('/request', requireAuth, RideController.requestRide);

// POST /api/rides/accept
// Requires JWT Authorization
router.post('/accept', requireAuth, RideController.acceptRide);

export default router;





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
router.post('/cancel', requireAuth, RideController.cancelRequest);
router.post('/complete', requireAuth, RideController.completeRide);
router.get('/history', requireAuth, RideController.getHistory);

export default router;

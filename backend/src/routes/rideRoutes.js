import { Router } from 'express';
import { RideController } from '../controllers/RideController.js';

const router = Router();

// ==========================================
// RIDE ROUTES
// ==========================================

// POST /api/rides/request
// Triggers the entire dispatch lifecycle.
router.post('/request', RideController.requestRide);

export default router;

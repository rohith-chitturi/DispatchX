import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';

const router = Router();

// ==========================================
// Authentication Endpoints
// ==========================================

// POST /api/auth/register
// Creates a new user in PostgreSQL and returns a JWT
router.post('/register', AuthController.register);

// POST /api/auth/login
// Verifies credentials using bcrypt and returns a JWT
router.post('/login', AuthController.login);

export default router;





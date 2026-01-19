import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Public routes (no authentication required)
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify', authController.verifyToken);

// SSO routes
router.get('/okta/login', authController.oktaSSOLogin);
router.get('/okta/callback', authController.oktaSSOCallback);

export default router;

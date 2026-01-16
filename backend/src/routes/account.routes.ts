import { Router } from 'express';
import * as accountController from '../controllers/account.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Global search across all identity sources
router.get('/search', accountController.searchAccounts);

// Get unified account view
router.get('/:identifier', accountController.getUnifiedAccount);

// Update account
router.put('/:source/:sourceId', accountController.updateAccount);

// Expire password
router.post('/:source/:sourceId/expire-password', accountController.expirePassword);

// Reset MFA
router.post('/:source/:sourceId/reset-mfa', accountController.resetMFA);

// Suspend account
router.post('/:source/:sourceId/suspend', accountController.suspendAccount);

export default router;

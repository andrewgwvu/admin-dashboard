import { Router } from 'express';
import * as networkController from '../controllers/network.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Device management
router.get('/devices', networkController.getDevices);
router.get('/devices/:deviceId', networkController.getDeviceById);
router.post('/devices/:deviceId/reboot', networkController.rebootDevice);

// Client management
router.get('/clients', networkController.getClients);
router.post('/clients/:clientMac/block', networkController.blockClient);
router.post('/clients/:clientMac/unblock', networkController.unblockClient);

// Site settings
router.get('/settings', networkController.getSiteSettings);
router.get('/wlans', networkController.getWLANs);

export default router;

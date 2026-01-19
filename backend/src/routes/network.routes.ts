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

// Alerts and events
router.get('/alerts', networkController.getAlerts);
router.get('/events', networkController.getEvents);

// WAN status
router.get('/wan-status', networkController.getWANStatus);

// MAC vendor lookup
router.get('/mac-lookup/:mac', networkController.lookupMacVendor);

export default router;

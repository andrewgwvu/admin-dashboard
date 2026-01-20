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

// Firmware management
router.get('/devices/:deviceId/firmware', networkController.getFirmwareInfo);
router.post('/devices/:deviceId/firmware/upgrade', networkController.upgradeFirmware);

// Switch port management
router.get('/switches/:switchId/ports', networkController.getSwitchPorts);
router.post('/switches/:switchId/ports/:portId', networkController.updateSwitchPort);
router.post('/switches/:switchId/ports/:portId/poe', networkController.toggleSwitchPortPoe);

// AP radio management
router.get('/aps/:apId/radios', networkController.getAPRadios);
router.post('/aps/:apId/radios/:radioId', networkController.updateAPRadio);

// WLAN management
router.post('/wlans/:wlanId', networkController.updateWLAN);
router.post('/wlans/:wlanId/toggle', networkController.toggleWLAN);

// WAN connection control
router.post('/gateways/:gatewayId/wan/:wanId/connect', networkController.connectWAN);
router.post('/gateways/:gatewayId/wan/:wanId/disconnect', networkController.disconnectWAN);

// Client rate limiting
router.post('/clients/:clientMac/rate-limit', networkController.setClientRateLimit);

// Traffic & bandwidth statistics
router.get('/traffic-stats', networkController.getTrafficStats);
router.get('/clients/:clientMac/traffic', networkController.getClientTraffic);
router.get('/top-clients', networkController.getTopClients);

// Network topology
router.get('/topology', networkController.getNetworkTopology);

// System logs
router.get('/logs', networkController.getSystemLogs);

export default router;

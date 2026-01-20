import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import omadaService from '../services/omada.service';
import macLookupService from '../services/mac-lookup.service';
import logger from '../config/logger';

export const getDevices = async (_req: AuthRequest, res: Response) => {
  try {
    const devices = await omadaService.getDevices();

    return res.json({
      success: true,
      data: devices,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get devices error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve network devices',
    } as ApiResponse);
  }
};

export const getDeviceById = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const deviceIdStr = Array.isArray(deviceId) ? deviceId[0] : deviceId;

    const device = await omadaService.getDeviceById(deviceIdStr);

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      data: device,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get device error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve device',
    } as ApiResponse);
  }
};

export const rebootDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const deviceIdStr = Array.isArray(deviceId) ? deviceId[0] : deviceId;

    const success = await omadaService.rebootDevice(deviceIdStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to reboot device',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Device reboot initiated',
    } as ApiResponse);
  } catch (error) {
    logger.error('Reboot device error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reboot device',
    } as ApiResponse);
  }
};

export const getClients = async (_req: AuthRequest, res: Response) => {
  try {
    const clients = await omadaService.getClients();

    // Enrich clients with MAC vendor lookup for those without vendor info
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        // If vendor is missing or unknown, look it up
        if (!client.vendor || client.vendor === 'Unknown' || client.vendor.trim() === '') {
          try {
            const vendor = await macLookupService.lookupVendor(client.mac);
            return { ...client, vendor: vendor || 'Unknown' };
          } catch (error) {
            logger.warn(`Failed to lookup vendor for MAC ${client.mac}:`, error);
            return { ...client, vendor: 'Unknown' };
          }
        }
        return client;
      })
    );

    return res.json({
      success: true,
      data: enrichedClients,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get clients error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve network clients',
    } as ApiResponse);
  }
};

export const blockClient = async (req: AuthRequest, res: Response) => {
  try {
    const { clientMac } = req.params;
    const clientMacStr = Array.isArray(clientMac) ? clientMac[0] : clientMac;

    const success = await omadaService.blockClient(clientMacStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to block client',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Client blocked successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Block client error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to block client',
    } as ApiResponse);
  }
};

export const unblockClient = async (req: AuthRequest, res: Response) => {
  try {
    const { clientMac } = req.params;
    const clientMacStr = Array.isArray(clientMac) ? clientMac[0] : clientMac;

    const success = await omadaService.unblockClient(clientMacStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to unblock client',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Client unblocked successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Unblock client error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unblock client',
    } as ApiResponse);
  }
};

export const getSiteSettings = async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await omadaService.getSiteSettings();

    return res.json({
      success: true,
      data: settings,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get site settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site settings',
    } as ApiResponse);
  }
};

export const getWLANs = async (_req: AuthRequest, res: Response) => {
  try {
    const wlans = await omadaService.getWLANs();

    return res.json({
      success: true,
      data: wlans,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get WLANs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve WLANs',
    } as ApiResponse);
  }
};

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;

    const alerts = await omadaService.getAlerts(page, pageSize);

    return res.json({
      success: true,
      data: alerts,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get alerts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
    } as ApiResponse);
  }
};

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;

    const events = await omadaService.getEvents(page, pageSize);

    return res.json({
      success: true,
      data: events,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve events',
    } as ApiResponse);
  }
};

export const getWANStatus = async (_req: AuthRequest, res: Response) => {
  try {
    const wanStatus = await omadaService.getWANStatus();

    return res.json({
      success: true,
      data: wanStatus,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get WAN status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve WAN status',
    } as ApiResponse);
  }
};

export const lookupMacVendor = async (req: AuthRequest, res: Response) => {
  try {
    const { mac } = req.params;
    const macStr = Array.isArray(mac) ? mac[0] : mac;

    if (!macStr) {
      return res.status(400).json({
        success: false,
        error: 'MAC address required',
      } as ApiResponse);
    }

    const vendor = await macLookupService.lookupVendor(macStr);

    return res.json({
      success: true,
      data: {
        mac: macStr,
        vendor: vendor || 'Unknown',
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('MAC lookup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to lookup MAC vendor',
    } as ApiResponse);
  }
};

// ========== Firmware Management ==========
export const getFirmwareInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const deviceIdStr = Array.isArray(deviceId) ? deviceId[0] : deviceId;

    const info = await omadaService.getFirmwareInfo(deviceIdStr);

    return res.json({
      success: true,
      data: info,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get firmware info error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve firmware info',
    } as ApiResponse);
  }
};

export const upgradeFirmware = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const deviceIdStr = Array.isArray(deviceId) ? deviceId[0] : deviceId;

    const success = await omadaService.upgradeFirmware(deviceIdStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upgrade firmware',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Firmware upgrade initiated',
    } as ApiResponse);
  } catch (error) {
    logger.error('Upgrade firmware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upgrade firmware',
    } as ApiResponse);
  }
};

// ========== Switch Port Management ==========
export const getSwitchPorts = async (req: AuthRequest, res: Response) => {
  try {
    const { switchId } = req.params;
    const switchIdStr = Array.isArray(switchId) ? switchId[0] : switchId;

    const ports = await omadaService.getSwitchPorts(switchIdStr);

    return res.json({
      success: true,
      data: ports,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get switch ports error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve switch ports',
    } as ApiResponse);
  }
};

export const updateSwitchPort = async (req: AuthRequest, res: Response) => {
  try {
    const { switchId, portId } = req.params;
    const switchIdStr = Array.isArray(switchId) ? switchId[0] : switchId;
    const portIdStr = Array.isArray(portId) ? portId[0] : portId;

    const success = await omadaService.updateSwitchPort(switchIdStr, portIdStr, req.body);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update switch port',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Switch port updated successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Update switch port error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update switch port',
    } as ApiResponse);
  }
};

export const toggleSwitchPortPoe = async (req: AuthRequest, res: Response) => {
  try {
    const { switchId, portId } = req.params;
    const { enabled } = req.body;
    const switchIdStr = Array.isArray(switchId) ? switchId[0] : switchId;
    const portIdStr = Array.isArray(portId) ? portId[0] : portId;

    const success = await omadaService.toggleSwitchPortPoe(switchIdStr, portIdStr, enabled);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to toggle PoE',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: `PoE ${enabled ? 'enabled' : 'disabled'} successfully`,
    } as ApiResponse);
  } catch (error) {
    logger.error('Toggle PoE error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle PoE',
    } as ApiResponse);
  }
};

// ========== AP Radio Management ==========
export const getAPRadios = async (req: AuthRequest, res: Response) => {
  try {
    const { apId } = req.params;
    const apIdStr = Array.isArray(apId) ? apId[0] : apId;

    const radios = await omadaService.getAPRadios(apIdStr);

    return res.json({
      success: true,
      data: radios,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get AP radios error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve AP radios',
    } as ApiResponse);
  }
};

export const updateAPRadio = async (req: AuthRequest, res: Response) => {
  try {
    const { apId, radioId } = req.params;
    const apIdStr = Array.isArray(apId) ? apId[0] : apId;
    const radioIdStr = Array.isArray(radioId) ? radioId[0] : radioId;

    const success = await omadaService.updateAPRadio(apIdStr, radioIdStr, req.body);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update AP radio',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'AP radio updated successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Update AP radio error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update AP radio',
    } as ApiResponse);
  }
};

// ========== WLAN Management ==========
export const updateWLAN = async (req: AuthRequest, res: Response) => {
  try {
    const { wlanId } = req.params;
    const wlanIdStr = Array.isArray(wlanId) ? wlanId[0] : wlanId;

    const success = await omadaService.updateWLAN(wlanIdStr, req.body);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update WLAN',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'WLAN updated successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Update WLAN error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update WLAN',
    } as ApiResponse);
  }
};

export const toggleWLAN = async (req: AuthRequest, res: Response) => {
  try {
    const { wlanId } = req.params;
    const { enabled } = req.body;
    const wlanIdStr = Array.isArray(wlanId) ? wlanId[0] : wlanId;

    const success = await omadaService.toggleWLAN(wlanIdStr, enabled);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to toggle WLAN',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: `WLAN ${enabled ? 'enabled' : 'disabled'} successfully`,
    } as ApiResponse);
  } catch (error) {
    logger.error('Toggle WLAN error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle WLAN',
    } as ApiResponse);
  }
};

// ========== WAN Connection Control ==========
export const connectWAN = async (req: AuthRequest, res: Response) => {
  try {
    const { gatewayId, wanId } = req.params;
    const gatewayIdStr = Array.isArray(gatewayId) ? gatewayId[0] : gatewayId;
    const wanIdStr = Array.isArray(wanId) ? wanId[0] : wanId;

    const success = await omadaService.connectWAN(gatewayIdStr, wanIdStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to connect WAN',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'WAN connected successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Connect WAN error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to connect WAN',
    } as ApiResponse);
  }
};

export const disconnectWAN = async (req: AuthRequest, res: Response) => {
  try {
    const { gatewayId, wanId } = req.params;
    const gatewayIdStr = Array.isArray(gatewayId) ? gatewayId[0] : gatewayId;
    const wanIdStr = Array.isArray(wanId) ? wanId[0] : wanId;

    const success = await omadaService.disconnectWAN(gatewayIdStr, wanIdStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to disconnect WAN',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'WAN disconnected successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Disconnect WAN error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to disconnect WAN',
    } as ApiResponse);
  }
};

// ========== Client Rate Limiting ==========
export const setClientRateLimit = async (req: AuthRequest, res: Response) => {
  try {
    const { clientMac } = req.params;
    const { download, upload } = req.body;
    const clientMacStr = Array.isArray(clientMac) ? clientMac[0] : clientMac;

    const success = await omadaService.setClientRateLimit(clientMacStr, download, upload);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to set rate limit',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Rate limit set successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Set rate limit error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set rate limit',
    } as ApiResponse);
  }
};

// ========== Traffic & Bandwidth Statistics ==========
export const getTrafficStats = async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await omadaService.getTrafficStats();

    return res.json({
      success: true,
      data: stats,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get traffic stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve traffic statistics',
    } as ApiResponse);
  }
};

export const getClientTraffic = async (req: AuthRequest, res: Response) => {
  try {
    const { clientMac } = req.params;
    const clientMacStr = Array.isArray(clientMac) ? clientMac[0] : clientMac;

    const traffic = await omadaService.getClientTraffic(clientMacStr);

    return res.json({
      success: true,
      data: traffic,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get client traffic error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve client traffic',
    } as ApiResponse);
  }
};

export const getTopClients = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topClients = await omadaService.getTopClients(limit);

    return res.json({
      success: true,
      data: topClients,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get top clients error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve top clients',
    } as ApiResponse);
  }
};

// ========== Network Topology ==========
export const getNetworkTopology = async (_req: AuthRequest, res: Response) => {
  try {
    const topology = await omadaService.getNetworkTopology();

    return res.json({
      success: true,
      data: topology,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get network topology error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve network topology',
    } as ApiResponse);
  }
};

// ========== System Logs ==========
export const getSystemLogs = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;

    const logs = await omadaService.getSystemLogs(page, pageSize);

    return res.json({
      success: true,
      data: logs,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get system logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve system logs',
    } as ApiResponse);
  }
};

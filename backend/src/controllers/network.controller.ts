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

    return res.json({
      success: true,
      data: clients,
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

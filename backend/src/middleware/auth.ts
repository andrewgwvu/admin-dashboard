import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import logger from '../config/logger';
import { serverInstance } from '../utils/serverInstance';

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      username: string;
      email: string;
      role: 'admin' | 'user';
      instanceId?: string;
    };

    // Check if token was issued by current server instance
    if (decoded.instanceId && decoded.instanceId !== serverInstance.getInstanceId()) {
      logger.info(`Token from previous server instance rejected (token: ${decoded.instanceId.substring(0, 8)}..., current: ${serverInstance.getInstanceId().substring(0, 8)}...)`);
      return res.status(401).json({ success: false, error: 'Session expired - server restarted' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  return next();
};

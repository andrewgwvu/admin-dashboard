import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, ApiResponse } from '../types';
import logger from '../config/logger';
import { query } from '../config/database';

/**
 * Get all users
 */
export const getUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, username, email, first_name, last_name, role, created_at, updated_at, last_login FROM users ORDER BY created_at DESC'
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }));

    return res.json({
      success: true,
      data: users,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
    } as ApiResponse);
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
      } as ApiResponse);
    }

    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "admin" or "user"',
      } as ApiResponse);
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Username or email already exists',
      } as ApiResponse);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, first_name, last_name, role, created_at, updated_at',
      [username, email, passwordHash, firstName, lastName, role || 'user']
    );

    const user = result.rows[0];

    // Log audit
    await query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user!.id,
        'CREATE_USER',
        'user',
        user.id,
        JSON.stringify({ username: user.username, email: user.email, role: user.role }),
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create user',
    } as ApiResponse);
  }
};

/**
 * Update a user
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, firstName, lastName, role, password } = req.body;

    // Validate role if provided
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "admin" or "user"',
      } as ApiResponse);
    }

    // Check if user exists
    const existingUser = await query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      } as ApiResponse);
    }

    values.push(id);
    const updateQuery = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, username, email, first_name, last_name, role, created_at, updated_at, last_login`;

    const result = await query(updateQuery, values);
    const user = result.rows[0];

    // Log audit
    await query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user!.id,
        'UPDATE_USER',
        'user',
        user.id,
        JSON.stringify({ changes: { username, email, firstName, lastName, role } }),
      ]
    );

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user',
    } as ApiResponse);
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (req.user!.id === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      } as ApiResponse);
    }

    // Check if user exists
    const existingUser = await query('SELECT username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }

    const username = existingUser.rows[0].username;

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Log audit
    await query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user!.id,
        'DELETE_USER',
        'user',
        id,
        JSON.stringify({ username }),
      ]
    );

    return res.json({
      success: true,
      message: 'User deleted successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    } as ApiResponse);
  }
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 100, offset = 0, userId, action } = req.query;

    let queryText = `
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.details,
        al.ip_address,
        al.created_at,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (userId) {
      queryText += ` AND al.user_id = $${paramCount++}`;
      params.push(userId);
    }

    if (action) {
      queryText += ` AND al.action = $${paramCount++}`;
      params.push(action);
    }

    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(Number(limit), Number(offset));

    const result = await query(queryText, params);

    const logs = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    }));

    return res.json({
      success: true,
      data: logs,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
    } as ApiResponse);
  }
};

/**
 * Get system configuration (safe values only, no secrets)
 */
export const getConfig = async (_req: AuthRequest, res: Response) => {
  try {
    const config = {
      integrations: {
        jumpcloud: {
          enabled: !!(process.env.JUMPCLOUD_API_KEY && process.env.JUMPCLOUD_ORG_ID),
          orgId: process.env.JUMPCLOUD_ORG_ID || null,
        },
        okta: {
          enabled: !!(process.env.OKTA_DOMAIN && process.env.OKTA_API_TOKEN),
          domain: process.env.OKTA_DOMAIN || null,
        },
        activeDirectory: {
          enabled: !!(process.env.AD_URL && process.env.AD_BASE_DN),
          url: process.env.AD_URL || null,
          baseDn: process.env.AD_BASE_DN || null,
        },
        omada: {
          enabled: !!(process.env.OMADA_URL && process.env.OMADA_USERNAME),
          url: process.env.OMADA_URL || null,
          siteId: process.env.OMADA_SITE_ID || null,
        },
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'homelab_dashboard',
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
      },
    };

    return res.json({
      success: true,
      data: config,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration',
    } as ApiResponse);
  }
};

/**
 * Update configuration
 * Note: This updates environment variables in memory only
 * For persistent changes, update .env file or container environment
 */
export const updateConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { integrations } = req.body;

    if (!integrations) {
      return res.status(400).json({
        success: false,
        error: 'Configuration data required',
      } as ApiResponse);
    }

    // Update environment variables
    if (integrations.jumpcloud) {
      if (integrations.jumpcloud.apiKey) process.env.JUMPCLOUD_API_KEY = integrations.jumpcloud.apiKey;
      if (integrations.jumpcloud.orgId) process.env.JUMPCLOUD_ORG_ID = integrations.jumpcloud.orgId;
    }

    if (integrations.okta) {
      if (integrations.okta.domain) process.env.OKTA_DOMAIN = integrations.okta.domain;
      if (integrations.okta.apiToken) process.env.OKTA_API_TOKEN = integrations.okta.apiToken;
    }

    if (integrations.activeDirectory) {
      if (integrations.activeDirectory.url) process.env.AD_URL = integrations.activeDirectory.url;
      if (integrations.activeDirectory.baseDn) process.env.AD_BASE_DN = integrations.activeDirectory.baseDn;
      if (integrations.activeDirectory.username) process.env.AD_USERNAME = integrations.activeDirectory.username;
      if (integrations.activeDirectory.password) process.env.AD_PASSWORD = integrations.activeDirectory.password;
    }

    if (integrations.omada) {
      if (integrations.omada.url) process.env.OMADA_URL = integrations.omada.url;
      if (integrations.omada.username) process.env.OMADA_USERNAME = integrations.omada.username;
      if (integrations.omada.password) process.env.OMADA_PASSWORD = integrations.omada.password;
      if (integrations.omada.siteId) process.env.OMADA_SITE_ID = integrations.omada.siteId;
    }

    // Log audit
    await query(
      'INSERT INTO audit_logs (user_id, action, resource_type, details) VALUES ($1, $2, $3, $4)',
      [
        req.user!.id,
        'UPDATE_CONFIG',
        'configuration',
        JSON.stringify({ integrations: Object.keys(integrations) }),
      ]
    );

    return res.json({
      success: true,
      message: 'Configuration updated successfully. Note: Changes are in-memory only. Update .env file for persistence.',
    } as ApiResponse);
  } catch (error) {
    logger.error('Update config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
    } as ApiResponse);
  }
};

/**
 * Get system stats
 */
export const getSystemStats = async (_req: AuthRequest, res: Response) => {
  try {
    const userCountResult = await query('SELECT COUNT(*) as count FROM users');
    const adminCountResult = await query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const auditCountResult = await query('SELECT COUNT(*) as count FROM audit_logs');
    const recentLoginsResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'7 days\''
    );

    const stats = {
      users: {
        total: parseInt(userCountResult.rows[0].count),
        admins: parseInt(adminCountResult.rows[0].count),
        recentLogins: parseInt(recentLoginsResult.rows[0].count),
      },
      auditLogs: {
        total: parseInt(auditCountResult.rows[0].count),
      },
    };

    return res.json({
      success: true,
      data: stats,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get system stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve system stats',
    } as ApiResponse);
  }
};

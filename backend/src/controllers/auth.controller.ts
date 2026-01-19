import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { ApiResponse } from '../types';
import logger from '../config/logger';
import { query } from '../config/database';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      } as ApiResponse);
    }

    // Query user from database
    const result = await query(
      'SELECT id, username, email, password_hash, first_name, last_name, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      } as ApiResponse);
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      } as ApiResponse);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      } as ApiResponse);
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role || 'user',
        },
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
    } as ApiResponse);
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
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

    // Create user (default role is 'user')
    const result = await query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, first_name, last_name, role',
      [username, email, passwordHash, firstName, lastName, 'user']
    );

    const user = result.rows[0];

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      } as ApiResponse);
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    } as ApiResponse);
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required',
      } as ApiResponse);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      } as ApiResponse);
    }

    const decoded = jwt.verify(token, jwtSecret);

    return res.json({
      success: true,
      data: decoded,
    } as ApiResponse);
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
    } as ApiResponse);
  }
};

export const oktaSSOLogin = async (_req: Request, res: Response) => {
  try {
    const oktaDomain = process.env.OKTA_DOMAIN;
    const clientId = process.env.OKTA_CLIENT_ID;
    const redirectUri = process.env.OKTA_REDIRECT_URI;

    if (!oktaDomain || !clientId || !redirectUri) {
      return res.status(500).json({
        success: false,
        error: 'Okta SSO not configured',
      } as ApiResponse);
    }

    // Generate random state for CSRF protection
    const state = Buffer.from(Math.random().toString()).toString('base64').substring(0, 20);

    // Store state in session/cookie if needed (simplified for now)
    const authUrl = `https://${oktaDomain}/oauth2/default/v1/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=openid profile email&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    return res.json({
      success: true,
      data: {
        authUrl,
        state,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Okta SSO login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate SSO login',
    } as ApiResponse);
  }
};

export const oktaSSOCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required',
      } as ApiResponse);
    }

    const oktaDomain = process.env.OKTA_DOMAIN;
    const clientId = process.env.OKTA_CLIENT_ID;
    const clientSecret = process.env.OKTA_CLIENT_SECRET;
    const redirectUri = process.env.OKTA_REDIRECT_URI;

    if (!oktaDomain || !clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({
        success: false,
        error: 'Okta SSO not configured',
      } as ApiResponse);
    }

    // Exchange code for token
    const tokenResponse = await axios.post(
      `https://${oktaDomain}/oauth2/default/v1/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userInfoResponse = await axios.get(
      `https://${oktaDomain}/oauth2/default/v1/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userInfo = userInfoResponse.data;

    // Find or create user in local database
    let userResult = await query(
      'SELECT id, username, email, first_name, last_name, role FROM users WHERE email = $1',
      [userInfo.email]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create new user from SSO
      const username = userInfo.preferred_username || userInfo.email.split('@')[0];
      const insertResult = await query(
        'INSERT INTO users (username, email, first_name, last_name, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, first_name, last_name, role',
        [
          username,
          userInfo.email,
          userInfo.given_name || '',
          userInfo.family_name || '',
          'user',
          '' // No password for SSO users
        ]
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];

      // Update existing user with latest Okta profile info and last login
      const updateResult = await query(
        'UPDATE users SET first_name = $1, last_name = $2, last_login = NOW() WHERE id = $3 RETURNING id, username, email, first_name, last_name, role',
        [userInfo.given_name || user.first_name, userInfo.family_name || user.last_name, user.id]
      );
      user = updateResult.rows[0];
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      } as ApiResponse);
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'user',
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    logger.error('Okta SSO callback error:', error);
    return res.status(500).json({
      success: false,
      error: 'SSO authentication failed',
    } as ApiResponse);
  }
};

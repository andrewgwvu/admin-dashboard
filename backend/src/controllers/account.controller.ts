import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import accountService from '../services/account.service';
import logger from '../config/logger';

export const searchAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      } as ApiResponse);
    }

    const results = await accountService.globalSearch(query);

    return res.json({
      success: true,
      data: results,
    } as ApiResponse);
  } catch (error) {
    logger.error('Search accounts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search accounts',
    } as ApiResponse);
  }
};

export const getUnifiedAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { identifier } = req.params;
    const { source } = req.query;

    const account = await accountService.getUnifiedAccount(
      identifier,
      source as string | undefined
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      data: account,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get unified account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve account',
    } as ApiResponse);
  }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { source, sourceId } = req.params;
    const updates = req.body;

    if (!['jumpcloud', 'okta', 'active-directory'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source',
      } as ApiResponse);
    }

    const success = await accountService.updateAccount(
      source as any,
      sourceId,
      updates
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update account',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Account updated successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Update account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update account',
    } as ApiResponse);
  }
};

export const expirePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { source, sourceId } = req.params;

    if (!['jumpcloud', 'okta', 'active-directory'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source',
      } as ApiResponse);
    }

    const success = await accountService.expirePassword(source as any, sourceId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to expire password',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Password expired successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Expire password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to expire password',
    } as ApiResponse);
  }
};

export const resetMFA = async (req: AuthRequest, res: Response) => {
  try {
    const { source, sourceId } = req.params;
    const { factorId } = req.body;

    if (!['jumpcloud', 'okta', 'active-directory'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source',
      } as ApiResponse);
    }

    const success = await accountService.resetMFA(source as any, sourceId, factorId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to reset MFA',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'MFA reset successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Reset MFA error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset MFA',
    } as ApiResponse);
  }
};

export const suspendAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { source, sourceId } = req.params;

    if (!['jumpcloud', 'okta', 'active-directory'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source',
      } as ApiResponse);
    }

    const success = await accountService.suspendAccount(source as any, sourceId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to suspend account',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      message: 'Account suspended successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Suspend account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to suspend account',
    } as ApiResponse);
  }
};

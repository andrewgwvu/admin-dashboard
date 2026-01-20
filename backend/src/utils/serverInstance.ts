// Server instance identifier
// This changes every time the server starts, invalidating all existing tokens
import crypto from 'crypto';
import logger from '../config/logger';

class ServerInstance {
  private instanceId: string;

  constructor() {
    this.instanceId = crypto.randomBytes(16).toString('hex');
    logger.info(`Server instance ID: ${this.instanceId}`);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }
}

export const serverInstance = new ServerInstance();

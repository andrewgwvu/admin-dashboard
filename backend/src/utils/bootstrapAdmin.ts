import bcrypt from 'bcryptjs';
import logger from '../config/logger';
import { query } from '../config/database';

type BootstrapOptions = {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  forceReset?: boolean;
};

/**
 * Ensures a dashboard admin user exists.
 *
 * This is intentionally gated behind environment variables so it can be used
 * to recover access if the DB is restored or credentials are lost.
 */
export const bootstrapAdminUser = async (opts: BootstrapOptions): Promise<void> => {
  const { username, email, password, firstName, lastName, forceReset } = opts;

  // Basic validation
  if (!username || !email || !password) {
    throw new Error('bootstrapAdminUser requires username, email, and password');
  }

  // If the users table doesn't exist yet, fail loudly with a helpful message.
  // (We avoid automatically running schema migrations here.)
  try {
    await query('SELECT 1 FROM users LIMIT 1');
  } catch (e: any) {
    logger.error('Database not initialized: users table not found or DB not reachable.');
    logger.error('Initialize the database (run backend/src/utils/database-init.sql) then restart the backend.');
    throw e;
  }

  // Check if user exists
  const existing = await query(
    'SELECT id, username, email FROM users WHERE username = $1 OR email = $2 LIMIT 1',
    [username, email]
  );

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.rows.length === 0) {
    await query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, email, passwordHash, firstName || null, lastName || null, 'admin']
    );
    logger.info(`Bootstrapped admin user '${username}' (${email})`);
    return;
  }

  const found = existing.rows[0];
  if (forceReset) {
    await query(
      'UPDATE users SET password_hash = $1, role = $2, updated_at = NOW() WHERE id = $3',
      [passwordHash, 'admin', found.id]
    );
    logger.warn(`Reset password for existing admin user '${found.username}' (${found.email}) via bootstrap`);
  } else {
    // Ensure existing user has admin role
    await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND role != $1',
      ['admin', found.id]
    );
    logger.info(`Admin user already exists ('${found.username}' / '${found.email}'); bootstrap skipped`);
  }
};

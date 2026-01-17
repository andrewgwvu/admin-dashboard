import { query, connectDB } from '../config/database';
import logger from '../config/logger';

/**
 * Utility script to promote a user to admin role
 * Usage: npm run promote-admin <username>
 */
async function promoteUserToAdmin(username: string) {
  try {
    await connectDB();

    // Check if user exists
    const userResult = await query(
      'SELECT id, username, email, role FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      logger.error(`User '${username}' not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];

    if (user.role === 'admin') {
      logger.info(`User '${username}' is already an admin`);
      process.exit(0);
    }

    // Update user role to admin
    await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE username = $2',
      ['admin', username]
    );

    logger.info(`Successfully promoted user '${username}' to admin role`);
    process.exit(0);
  } catch (error) {
    logger.error('Error promoting user to admin:', error);
    process.exit(1);
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('Usage: npm run promote-admin <username>');
  process.exit(1);
}

promoteUserToAdmin(username);

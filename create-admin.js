#!/usr/bin/env node

/**
 * Create Admin User Script
 * Run this script after database initialization to create an admin user
 *
 * Usage:
 *   node create-admin.js
 *
 * Or with Docker:
 *   docker-compose exec backend node /app/create-admin.js
 */

const readline = require('readline');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n========================================');
  console.log('Create Admin User');
  console.log('========================================\n');

  try {
    // Get database connection from environment or use defaults
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'homelab',
      password: process.env.DB_PASSWORD || 'homelab',
      database: process.env.DB_NAME || 'homelab_dashboard',
    });

    // Test connection
    await pool.query('SELECT 1');
    console.log('✓ Connected to database\n');

    // Get user input
    const username = await question('Username [admin]: ') || 'admin';
    const email = await question('Email [admin@example.com]: ') || 'admin@example.com';
    const firstName = await question('First Name [Admin]: ') || 'Admin';
    const lastName = await question('Last Name [User]: ') || 'User';

    // Get password (note: this will be visible in terminal)
    const password = await question('Password: ');

    if (!password) {
      console.error('\n❌ Password cannot be empty');
      process.exit(1);
    }

    console.log('\n⏳ Creating user...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING
       RETURNING id`,
      [username, email, passwordHash, firstName, lastName]
    );

    if (result.rowCount > 0) {
      console.log('\n✅ Admin user created successfully!\n');
      console.log('Login credentials:');
      console.log(`  Username: ${username}`);
      console.log(`  Email: ${email}`);
      console.log(`\nYou can now login at http://localhost:3000\n`);
    } else {
      console.log('\n⚠️  User already exists with that username');
      console.log('Please choose a different username or delete the existing user first.\n');
    }

    await pool.end();
    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('  1. PostgreSQL is running (docker-compose up -d)');
    console.error('  2. Database has been initialized');
    console.error('  3. Environment variables are set correctly\n');
    rl.close();
    process.exit(1);
  }
}

main();

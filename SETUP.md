# Homelab Dashboard Setup Guide

This guide will walk you through setting up your Homelab Management Dashboard from scratch.

## Prerequisites

Before you begin, ensure you have:

1. **Docker and Docker Compose** installed on your system
2. **API credentials** for:
   - JumpCloud (API Key and Org ID)
   - Okta (Domain and API Token)
   - TP-Link Omada Controller (Username, Password, URL, Site ID)
3. **Active Directory** connection details (LDAP URL, Base DN, service account credentials)
4. **Node.js 20+** (for local development only)

## Quick Start with Docker

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd admin-dashboard
```

### 2. Configure Environment Variables

Copy the example environment file and edit it with your credentials:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Fill in all the required values:

```env
# Database Configuration
DB_USER=homelab
DB_PASSWORD=<generate-a-strong-password>
REDIS_PASSWORD=<generate-a-strong-password>

# JWT Secret (IMPORTANT: Generate a strong random string)
JWT_SECRET=<generate-a-random-32+-character-string>

# JumpCloud Configuration
JUMPCLOUD_API_KEY=<your-jumpcloud-api-key>
JUMPCLOUD_ORG_ID=<your-jumpcloud-org-id>

# Okta Configuration
OKTA_DOMAIN=<your-domain>.okta.com
OKTA_API_TOKEN=<your-okta-api-token>

# Active Directory Configuration
AD_URL=ldap://<your-ad-server>:389
AD_BASE_DN=DC=your,DC=domain,DC=local
AD_USERNAME=CN=Service Account,CN=Users,DC=your,DC=domain,DC=local
AD_PASSWORD=<your-ad-service-account-password>

# TP-Link Omada Configuration
OMADA_URL=https://<your-omada-controller>:8043
OMADA_USERNAME=<your-omada-admin-username>
OMADA_PASSWORD=<your-omada-admin-password>
OMADA_SITE_ID=<your-site-id>

# Frontend Configuration
VITE_API_URL=http://localhost:3001
```

### 3. Initialize the Database

The database will be automatically initialized when you start the containers, but you need to create the initial user account.

First, start the database container:

```bash
docker-compose up -d postgres
```

Wait a few seconds for PostgreSQL to start, then run the initialization script:

```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -f /tmp/database-init.sql
```

Or manually connect and run the SQL:

```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard
```

Then paste the contents of `backend/src/utils/database-init.sql`.

### 4. Create Your First Admin User

Connect to the database and create an admin user:

```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard
```

```sql
-- Replace values with your desired credentials
INSERT INTO users (username, email, password_hash, first_name, last_name)
VALUES (
  'admin',
  'admin@yourdomain.com',
  -- Password: 'admin123' (change this!)
  '$2a$10$rQZ9x.vJYZ3NN8V5K5v5Y.6nJZWJXvXvXXXXXXXXXXXXXXXXXXXXXXX',
  'Admin',
  'User'
);
```

**IMPORTANT:** Generate a proper bcrypt hash for your password. You can use an online bcrypt generator or Node.js:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-secure-password', 10);
console.log(hash);
```

### 5. Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Backend API (port 3001)
- Frontend web app (port 3000)

### 6. Verify Installation

Check that all containers are running:

```bash
docker-compose ps
```

Check the logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 7. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

Log in with the credentials you created in step 4.

## Local Development Setup

If you want to develop locally without Docker:

### Backend Setup

```bash
cd backend
npm install
cp ../.env.example ../.env
# Edit .env with your configuration
npm run dev
```

The backend will start on http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:3000

## Configuration Details

### JumpCloud Setup

1. Log in to your JumpCloud admin console
2. Go to Administrator → API Settings
3. Create a new API key with appropriate permissions
4. Copy the API key and your Organization ID

Required permissions:
- Read/Write access to users
- Read access to groups
- MFA management permissions

### Okta Setup

1. Log in to your Okta admin console
2. Go to Security → API
3. Create a new API token
4. Copy the token and your Okta domain

Required permissions:
- User management
- Group management
- Factor (MFA) management

### Active Directory Setup

1. Create a service account in AD with read permissions
2. Note the LDAP URL (usually `ldap://dc.yourdomain.local:389`)
3. Get the Base DN (e.g., `DC=yourdomain,DC=local`)
4. Use the service account's Distinguished Name and password

Example DN: `CN=ServiceAccount,CN=Users,DC=yourdomain,DC=local`

### TP-Link Omada Setup

1. Access your Omada Controller
2. Create an admin user or use existing credentials
3. Note the controller URL (usually `https://<ip>:8043`)
4. Find your Site ID:
   - Log in to the controller
   - Go to Settings → Site
   - The Site ID is in the URL or site settings

## Troubleshooting

### Database Connection Issues

If the backend can't connect to PostgreSQL:

1. Ensure PostgreSQL is running: `docker-compose ps postgres`
2. Check logs: `docker-compose logs postgres`
3. Verify credentials in `.env` match the database

### API Integration Errors

If you see errors connecting to JumpCloud, Okta, or AD:

1. Verify your API credentials are correct
2. Check network connectivity to the services
3. Ensure API keys have necessary permissions
4. Review backend logs: `docker-compose logs backend`

### Omada Controller Issues

If TP-Link Omada integration fails:

1. Verify the controller URL is accessible
2. Check if you're using a self-signed certificate (this is handled automatically)
3. Ensure the user has admin privileges
4. Verify the Site ID is correct

### Frontend Can't Connect to Backend

1. Ensure backend is running: `docker-compose ps backend`
2. Check backend logs: `docker-compose logs backend`
3. Verify `VITE_API_URL` in `.env` points to correct backend URL
4. Check if port 3001 is accessible

## Security Best Practices

1. **Change default passwords**: Never use default or simple passwords
2. **Use strong JWT secret**: Generate a random 32+ character string
3. **Rotate API keys regularly**: Update your JumpCloud and Okta API keys periodically
4. **Use HTTPS in production**: Configure SSL/TLS certificates
5. **Restrict network access**: Use firewall rules to limit who can access the dashboard
6. **Regular backups**: Back up your PostgreSQL database regularly
7. **Monitor logs**: Regularly review audit logs for suspicious activity

## Updating

To update to the latest version:

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Backup and Restore

### Backup Database

```bash
docker-compose exec postgres pg_dump -U homelab homelab_dashboard > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U homelab -d homelab_dashboard < backup.sql
```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Review this setup guide
3. Check the main README.md for additional information
4. Open an issue on the repository

## Next Steps

Once you're up and running:

1. **Test the global search**: Search for a user across all identity sources
2. **View an account**: Click on a search result to see the unified account view
3. **Manage MFA**: Try resetting MFA for a test account
4. **Check network devices**: Go to the Network page to view your Omada devices
5. **Monitor clients**: See all connected network clients

Enjoy your new homelab dashboard!

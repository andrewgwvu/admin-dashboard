# Quick Start Guide

Get your homelab dashboard running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Git (to clone the repository)

## Step 1: Configure Environment

Copy the example environment file and edit it with your credentials:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required settings:**
- `DB_PASSWORD` - Set a secure database password
- `REDIS_PASSWORD` - Set a secure Redis password
- `JWT_SECRET` - Set a random 32+ character secret key

**API credentials (optional for initial setup):**
- JumpCloud: `JUMPCLOUD_API_KEY` and `JUMPCLOUD_ORG_ID`
- Okta: `OKTA_DOMAIN` and `OKTA_API_TOKEN`
- Active Directory: `AD_URL`, `AD_BASE_DN`, `AD_USERNAME`, `AD_PASSWORD`
- TP-Link Omada: `OMADA_URL`, `OMADA_USERNAME`, `OMADA_PASSWORD`, `OMADA_SITE_ID`

> **Tip:** You can start without API credentials and add them later. The dashboard will still work, just without external integrations.

## Step 2: Start the Services

```bash
docker-compose up -d
```

This will:
- Build the backend and frontend images
- Start PostgreSQL database
- Start Redis cache
- Start backend API server
- Start frontend web server

Check if all services are running:

```bash
docker-compose ps
```

You should see 4 services: `postgres`, `redis`, `backend`, and `frontend`.

## Step 3: Initialize the Database

Wait about 10 seconds for PostgreSQL to fully start, then run:

```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -f /docker-entrypoint-initdb.d/init.sql
```

Or copy the SQL file and run it:

```bash
docker cp backend/src/utils/database-init.sql $(docker-compose ps -q postgres):/tmp/init.sql
docker-compose exec postgres psql -U homelab -d homelab_dashboard -f /tmp/init.sql
```

You should see output indicating tables were created successfully.

## Step 4: Create Admin User

### Option A: Using the Node.js script (Recommended)

```bash
# Copy the script into the backend container
docker cp create-admin.js $(docker-compose ps -q backend):/app/create-admin.js

# Run it
docker-compose exec backend node create-admin.js
```

Follow the prompts to create your admin user.

### Option B: Using Direct SQL

Connect to PostgreSQL and create a user:

```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard
```

Then run this SQL (replace values as needed):

```sql
-- First, generate a bcrypt hash for your password
-- You can use: https://bcrypt-generator.com/ with 10 rounds
-- Or run: node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"

INSERT INTO users (username, email, password_hash, first_name, last_name)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$YourBcryptHashHere',  -- Replace with actual hash
  'Admin',
  'User'
);
```

Type `\q` to exit psql.

### Option C: Quick Test User (Development Only)

For testing, create a simple user with password 'admin123':

```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -c "
INSERT INTO users (username, email, password_hash, first_name, last_name)
VALUES (
  'admin',
  'admin@example.com',
  '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye1JrK.z8FVvH3v4COKxLLvWbLgYdVXoW',
  'Admin',
  'User'
);
"
```

> **Note:** This creates a user with password `admin123`. Change it immediately after logging in!

## Step 5: Access the Dashboard

Open your browser and navigate to:

**http://localhost:3000**

Login with the credentials you created in Step 4.

## Step 6: Configure API Integrations (Optional)

Once logged in, you can test the integrations:

1. Go to the Accounts page
2. Try searching for a user (requires API credentials configured)
3. Go to the Network page
4. View your network devices (requires Omada credentials)

## Troubleshooting

### Services won't start

Check the logs:
```bash
docker-compose logs
```

For a specific service:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Can't connect to database

Make sure PostgreSQL is running:
```bash
docker-compose ps postgres
```

Check if it's healthy:
```bash
docker-compose exec postgres pg_isready -U homelab
```

### Frontend shows "Cannot connect to server"

Check if the backend is running:
```bash
docker-compose logs backend
```

Check the backend health endpoint:
```bash
curl http://localhost:3001/health
```

### Forgot admin password

Reset the password by running SQL:
```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -c "
UPDATE users
SET password_hash = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye1JrK.z8FVvH3v4COKxLLvWbLgYdVXoW'
WHERE username = 'admin';
"
```

This sets the password to `admin123`.

## Stopping the Dashboard

To stop all services:
```bash
docker-compose down
```

To stop and remove all data (database, Redis):
```bash
docker-compose down -v
```

## Next Steps

- Configure your API credentials in `.env`
- Restart services: `docker-compose restart`
- Test each integration
- Review the API documentation: http://localhost:3001/api-docs

## Common Commands

```bash
# View all logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Rebuild after code changes
docker-compose up -d --build

# Check service status
docker-compose ps

# Access database
docker-compose exec postgres psql -U homelab -d homelab_dashboard

# Access backend shell
docker-compose exec backend sh

# Access frontend build logs
docker-compose logs frontend
```

## Need Help?

1. Check the main [README.md](README.md) for detailed information
2. Review [SETUP.md](SETUP.md) for comprehensive setup instructions
3. Check [docs/API.md](docs/API.md) for API documentation
4. Open an issue on GitHub

---

**Congratulations!** Your homelab dashboard is now running! 🎉

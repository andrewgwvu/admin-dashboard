# Troubleshooting Guide

Common issues and their solutions for the Homelab Dashboard.

## Database Issues

### Error: "database 'homelab' does not exist"

**Cause:** Your `.env` file doesn't have `DB_NAME` set, or it's set incorrectly.

**Solution:**

1. Check your `.env` file:
```bash
cat .env | grep DB_NAME
```

2. Make sure it's set to:
```bash
DB_NAME=homelab_dashboard
```

3. Restart the backend:
```bash
docker-compose restart backend
```

### Can't connect to database

**Check if PostgreSQL is running:**
```bash
docker-compose ps postgres
# Should show "Up" status
```

**Check database health:**
```bash
docker-compose exec postgres pg_isready -U homelab
# Should output: "accepting connections"
```

**View PostgreSQL logs:**
```bash
docker-compose logs postgres
```

**Manually connect to check database:**
```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -c "\l"
# Should list homelab_dashboard database
```

## Active Directory Issues

### Windows Server 2022 - LDAPS Required

**Important:** Windows Server 2022 enforces LDAP channel binding and signing by default, which means you **must use LDAPS** (LDAP over SSL/TLS).

**Configuration for Server 2022:**

Edit `.env` and use LDAPS with port 636:
```bash
# Server 2022 requires LDAPS
AD_URL=ldaps://your-ad-server.local:636
# Or with IP address (recommended):
AD_URL=ldaps://192.168.1.100:636

AD_BASE_DN=DC=yourdomain,DC=local
AD_USERNAME=CN=Service Account,CN=Users,DC=yourdomain,DC=local
AD_PASSWORD=your-password
```

**Self-Signed Certificates:**
The dashboard automatically accepts self-signed certificates (common in internal AD environments). If you see certificate errors, the code is already configured to handle them.

**For older servers (2019 and below):**
```bash
# Older servers can use plain LDAP
AD_URL=ldap://your-ad-server.local:389
```

**Verify LDAPS is enabled on your server:**
```powershell
# On your AD server (PowerShell as Admin):
Test-NetConnection -ComputerName your-dc-name -Port 636
```

If port 636 is closed, you need to install a certificate and enable LDAPS on your domain controller.

**Quick LDAPS Certificate Setup (if needed):**
1. Open Certificate Authority snap-in on DC
2. Request new certificate (Computer certificate)
3. Or use: `certutil -pulse` to auto-enroll
4. Restart AD DS service: `Restart-Service NTDS -Force`

### Error: "getaddrinfo ENOTFOUND ad.yourdomain.com"

**Cause:** Docker container cannot resolve your internal AD server hostname.

**Solutions:**

#### Option 1: Use IP Address (Recommended)

Edit `.env`:
```bash
# Change from hostname:
AD_URL=ldaps://ad.yourdomain.com:636

# To IP address (for Server 2022):
AD_URL=ldaps://192.168.1.100:636

# Or for older servers:
AD_URL=ldap://192.168.1.100:389
```

#### Option 2: Add Your DNS Server

Edit `docker-compose.yml`, find the `backend` service and update the `dns` section:
```yaml
backend:
  # ...
  dns:
    - 192.168.1.1  # Your internal DNS server
    - 8.8.8.8      # Fallback
```

#### Option 3: Use Docker Host Network

If your AD server is on the same machine, you can use `host.docker.internal`:
```bash
AD_URL=ldap://host.docker.internal:389
```

**After making changes, restart:**
```bash
docker-compose down
docker-compose up -d
```

### AD Connection Timeout

**For Server 2022 (LDAPS), check if port 636 is accessible:**
```bash
docker-compose exec backend sh -c "nc -zv your-ad-server 636"
# Or test from host:
telnet your-ad-server 636
# Or use PowerShell:
Test-NetConnection -ComputerName your-ad-server -Port 636
```

**For older servers (LDAP), check port 389:**
```bash
docker-compose exec backend sh -c "nc -zv your-ad-server 389"
telnet your-ad-server 389
```

If the connection fails, check:
- Firewall rules on AD server (allow port 636 for LDAPS or 389 for LDAP)
- Network connectivity from Docker to AD server
- AD server is running and accessible
- For Server 2022: LDAPS certificate is installed and AD DS service is running

### AD Authentication Failed

Check your AD credentials in `.env`:
```bash
AD_USERNAME=CN=Service Account,CN=Users,DC=yourdomain,DC=local
AD_PASSWORD=your-password
```

Make sure:
- Username is the full Distinguished Name (DN)
- Service account has read permissions
- Password is correct (no extra quotes or spaces)

**Test AD connection manually:**
```bash
# For Server 2022 (LDAPS):
docker-compose exec backend sh
# Inside container:
ldapsearch -H ldaps://your-ad-server:636 -D "CN=Service Account,CN=Users,DC=yourdomain,DC=local" -w "your-password" -b "DC=yourdomain,DC=local" "(cn=*)"

# For older servers (LDAP):
ldapsearch -H ldap://your-ad-server:389 -D "CN=Service Account,CN=Users,DC=yourdomain,DC=local" -w "your-password" -b "DC=yourdomain,DC=local" "(cn=*)"
```

Note: ldapsearch may not be available in the Alpine-based container. You can verify connection from the logs when the backend starts.

## JumpCloud Issues

### No JumpCloud results in search

**Check if API key is configured:**
```bash
cat .env | grep JUMPCLOUD_API_KEY
```

**View backend logs for JumpCloud errors:**
```bash
docker-compose logs backend | grep -i jumpcloud
```

Common issues:
- API key is empty or invalid
- API key doesn't have correct permissions
- Network connectivity issue to JumpCloud API

**Test JumpCloud API manually:**
```bash
curl -H "x-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://console.jumpcloud.com/api/systemusers
```

Should return JSON with users. If it returns 401, your API key is invalid.

### JumpCloud API Key Permissions

Make sure your JumpCloud API key has these permissions:
- Read Users
- Read Groups
- Read MFA

## Okta Issues

### Okta search returns no results

**Check configuration:**
```bash
cat .env | grep OKTA
```

Both `OKTA_DOMAIN` and `OKTA_API_TOKEN` must be set.

**Test Okta API:**
```bash
curl -H "Authorization: SSWS YOUR_API_TOKEN" \
     https://your-domain.okta.com/api/v1/users?limit=1
```

### Okta API Token Invalid

1. Log into Okta Admin Console
2. Go to Security → API → Tokens
3. Create a new token or verify existing token
4. Update `.env` with the new token
5. Restart: `docker-compose restart backend`

## Network/TP-Link Omada Issues

### Can't connect to Omada Controller

**Check Omada URL in `.env`:**
```bash
cat .env | grep OMADA_URL
# Should be: https://controller-ip:8043 or https://controller-hostname:8043
```

**Test connectivity:**
```bash
docker-compose exec backend sh -c "curl -k https://your-omada-controller:8043"
```

### SSL Certificate Issues

If you're using self-signed certificates, the dashboard handles this automatically. But you can verify:
```bash
curl -k https://your-omada-controller:8043
```

The `-k` flag ignores certificate warnings.

## Frontend Issues

### Frontend shows "Cannot connect to server"

**Check if backend is running:**
```bash
docker-compose ps backend
# Should show "Up" status
```

**Test backend API:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Check backend logs:**
```bash
docker-compose logs backend
```

### Login fails with "Invalid credentials"

**Verify admin user exists:**
```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -c "SELECT username, email FROM users;"
```

**Reset admin password:**
```bash
docker-compose exec postgres psql -U homelab -d homelab_dashboard -c "
UPDATE users
SET password_hash = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye1JrK.z8FVvH3v4COKxLLvWbLgYdVXoW'
WHERE username = 'admin';
"
```

This sets password to `admin123`.

## Docker Issues

### Services won't start

**Check Docker resources:**
- Make sure Docker has enough memory allocated (at least 4GB)
- Check disk space: `df -h`

**View all logs:**
```bash
docker-compose logs
```

**Check specific service:**
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs redis
```

### Build fails

**Clear Docker cache and rebuild:**
```bash
docker-compose down
docker system prune -a  # Warning: removes all unused images
docker-compose build --no-cache
docker-compose up -d
```

### Port conflicts

If ports 3000, 3001, 5432, or 6379 are already in use:

Edit `docker-compose.yml` to change the exposed ports:
```yaml
services:
  frontend:
    ports:
      - "3100:80"  # Change 3000 to 3100
  backend:
    ports:
      - "3101:3001"  # Change 3001 to 3101
```

## Checking Service Status

### View all running containers
```bash
docker-compose ps
```

### Check health status
```bash
docker-compose ps
# Look for "(healthy)" in the status column
```

### View logs in real-time
```bash
docker-compose logs -f
# Or for specific service:
docker-compose logs -f backend
```

### Restart a service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild and restart a service
```bash
docker-compose up -d --build backend
```

## Environment Variables

### Check what environment variables are being used

**Backend:**
```bash
docker-compose exec backend env | sort
```

**View effective configuration:**
```bash
docker-compose config
```

### Reload environment variables

After editing `.env`:
```bash
docker-compose down
docker-compose up -d
```

Or to restart just one service:
```bash
docker-compose up -d backend
```

## Performance Issues

### Slow searches

Check backend logs for slow queries:
```bash
docker-compose logs backend | grep "Executed query"
```

### High memory usage

Check container resource usage:
```bash
docker stats
```

## Getting More Help

### Enable debug logging

Edit `backend/src/config/logger.ts` and change log level to `debug`:
```typescript
level: process.env.LOG_LEVEL || 'debug',
```

Rebuild: `docker-compose up -d --build backend`

### Collect diagnostic information

```bash
# Save all logs
docker-compose logs > logs.txt

# Check service status
docker-compose ps > status.txt

# Check configuration
docker-compose config > config.txt
```

### Report an issue

Include:
1. Logs from the failing service
2. Your `.env` file (with secrets removed)
3. Output of `docker-compose ps`
4. Steps to reproduce the issue

## Quick Commands Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps

# Access database
docker-compose exec postgres psql -U homelab -d homelab_dashboard

# Access backend shell
docker-compose exec backend sh

# View environment variables
docker-compose exec backend env

# Clean everything (WARNING: destroys data)
docker-compose down -v
docker system prune -a
```

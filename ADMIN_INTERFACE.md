# Admin Interface Documentation

## Overview

The admin interface provides a web-based interface for managing the homelab dashboard, including user management, system configuration, and audit log viewing.

## Features

### 1. User Management
- Create new dashboard users via the web interface
- Edit existing users (username, email, password, name, role)
- Delete users
- Assign admin or user roles
- View user activity (last login)

### 2. Configuration Management
- Configure integration settings via web interface
- Manage JumpCloud, Okta, Active Directory, and Omada credentials
- View integration status at a glance
- Update configuration without command line access

### 3. Audit Logs
- View all administrative actions
- Filter by user, action type, or date
- Track changes to users and configuration
- Export capability for compliance

### 4. System Statistics
- View total users and admin count
- Monitor active users (last 7 days)
- Track audit log count

## Getting Started

### Creating an Admin User

You have two options to create an admin user:

#### Option 1: Bootstrap Admin User (Recommended)

Add these environment variables to your `.env` file:

```bash
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=YourSecurePassword123
ADMIN_BOOTSTRAP_FORCE_RESET=false  # Set to true to reset password on restart
```

Then restart the backend:

```bash
docker compose restart backend
```

The admin user will be created automatically on startup.

#### Option 2: Manual Database Update

Connect to the PostgreSQL database and update an existing user's role:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

### Accessing the Admin Interface

1. Log in to the dashboard with an admin account
2. You will see an "Administration" section in the sidebar
3. Click on any admin menu item to access admin features:
   - **Admin Dashboard**: Overview with statistics
   - **User Management**: Create, edit, and delete users
   - **Configuration**: Manage integration settings
   - **Audit Logs**: View system activity

## User Management

### Creating Users

1. Navigate to **Admin > User Management**
2. Click the **Create User** button
3. Fill in the form:
   - Username (required)
   - Email (required)
   - Password (required)
   - First Name (optional)
   - Last Name (optional)
   - Role (admin or user)
4. Click **Create**

**Note**: Users created via the web interface will persist across container restarts as long as you don't remove Docker volumes.

### Editing Users

1. Navigate to **Admin > User Management**
2. Click the **Edit** icon next to the user you want to modify
3. Update the fields you want to change
4. Leave the password field blank to keep the current password
5. Click **Update**

### Deleting Users

1. Navigate to **Admin > User Management**
2. Click the **Delete** icon next to the user
3. Confirm the deletion

**Note**: You cannot delete your own account.

## Configuration Management

### Updating Integration Settings

1. Navigate to **Admin > Configuration**
2. You'll see the current status of each integration (enabled/disabled)
3. Update the fields for the integration you want to configure
4. Leave credential fields blank to keep current values
5. Click **Save Configuration**

**Important**: Configuration changes made via the web interface are in-memory only and will be lost on container restart. For persistent changes, update your `.env` file.

### Available Integrations

#### JumpCloud
- API Key
- Organization ID

#### Okta
- Domain (e.g., your-domain.okta.com)
- API Token

#### Active Directory
- LDAP URL (e.g., ldaps://server:636)
- Base DN (e.g., DC=domain,DC=local)
- Username
- Password

#### TP-Link Omada
- Controller URL (e.g., https://controller:8043)
- Username
- Password
- Site ID

## Audit Logs

### Viewing Audit Logs

1. Navigate to **Admin > Audit Logs**
2. Browse the log entries showing:
   - Timestamp
   - User who performed the action
   - Action type (Create, Update, Delete, etc.)
   - Resource affected
   - Detailed information
   - IP address (when available)

### Pagination

- Use the **Previous** and **Next** buttons to navigate through logs
- Default view shows 100 entries per page

## Database Persistence

### Understanding Docker Volumes

The dashboard uses Docker volumes to persist data:

```yaml
volumes:
  postgres-data:  # User data stored here
  redis-data:     # Session cache stored here
```

### Keeping Your Data Safe

**DO NOT run these commands unless you want to lose all data:**
```bash
# This will DELETE all users and audit logs
docker compose down -v

# This will DELETE the database volume
docker volume rm admin-dashboard_postgres-data
```

**Safe commands to use:**
```bash
# Restart services without losing data
docker compose restart

# Stop services without losing data
docker compose stop

# Start services
docker compose start

# Rebuild and restart (keeps data)
docker compose up -d --build
```

### Backup Recommendations

To backup your user database:

```bash
# Backup database
docker compose exec postgres pg_dump -U homelab homelab_dashboard > backup.sql

# Restore database
docker compose exec -T postgres psql -U homelab homelab_dashboard < backup.sql
```

## Security Best Practices

1. **Use Strong Passwords**: Enforce strong passwords for all admin users
2. **Limit Admin Access**: Only grant admin role to trusted users
3. **Review Audit Logs**: Regularly check audit logs for suspicious activity
4. **Keep Credentials Secret**: Never commit `.env` files with real credentials
5. **Use HTTPS**: In production, always use HTTPS for the frontend
6. **Regular Backups**: Backup your database regularly

## Troubleshooting

### Users Getting Deleted

If users are being deleted, check:
1. Are you running `docker compose down -v`? This deletes volumes.
2. Use `docker compose down` (without `-v`) or `docker compose restart` instead.

### Can't Access Admin Interface

1. Verify your user has the `admin` role:
   ```sql
   SELECT username, email, role FROM users;
   ```
2. Check if you're logged in with the correct account
3. Log out and log back in to refresh the session

### Configuration Changes Not Persisting

Configuration changes via the web interface are in-memory only. To make them persistent:
1. Update your `.env` file with the new values
2. Restart the backend: `docker compose restart backend`

### Integration Not Working After Config Update

Some integrations may require a backend restart:
```bash
docker compose restart backend
```

## API Endpoints

All admin endpoints require authentication and admin role.

### User Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Configuration
- `GET /api/admin/config` - Get configuration
- `PUT /api/admin/config` - Update configuration

### Audit Logs
- `GET /api/admin/audit-logs` - Get audit logs

### Statistics
- `GET /api/admin/stats` - Get system statistics

## Role-Based Access Control

### User Roles

- **admin**: Full access to all features including admin interface
- **user**: Access to dashboard, accounts, and network pages only

### Permission Matrix

| Feature | User | Admin |
|---------|------|-------|
| View Dashboard | ✓ | ✓ |
| Search Accounts | ✓ | ✓ |
| Manage Accounts | ✓ | ✓ |
| View Network | ✓ | ✓ |
| Manage Network | ✓ | ✓ |
| User Management | ✗ | ✓ |
| Configuration | ✗ | ✓ |
| Audit Logs | ✗ | ✓ |
| System Stats | ✗ | ✓ |

## Support

For issues or questions:
- Check the logs: `docker compose logs backend`
- Review audit logs for recent changes
- Verify environment variables are set correctly

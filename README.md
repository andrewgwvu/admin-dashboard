# Homelab Management Dashboard

An all-in-one management dashboard for homelabs, integrating multiple identity and network management systems into a unified interface.

## Features

### Account Management
- **Unified Global Search**: Search across JumpCloud, Okta, and Active Directory using any attribute
- **Account Lifecycle Management**: Create, update, disable, and delete accounts across all platforms
- **MFA Management**: View and reset MFA devices for users
- **Aggregated View**: See all account sources for a user in one interface
- **Password Management**: View password change and expiry dates

### Network Management
- **TP-Link Omada Integration**: Full network device and client management
- **Device Monitoring**: View status of all network devices
- **Client Management**: Monitor and manage connected clients
- **Network Operations**: Perform all available network tasks through the Omada API

## Supported Integrations

- **JumpCloud**: Cloud Directory, LDAP, RADIUS, SSO
- **Okta**: SSO and identity management
- **Windows Active Directory**: On-premises directory services
- **TP-Link Omada**: Network controller (v6.0.0.25)

## Architecture

- **Frontend**: React + TypeScript + Vite with Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Redis
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- API credentials for JumpCloud, Okta, and TP-Link Omada
- Access to your Active Directory server

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd admin-dashboard
```

2. Copy the example environment file and configure your credentials:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the dashboard:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Development Mode

To run in development mode with hot-reload:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Setting Up Admin Users

By default, all registered users have the 'user' role. To promote a user to admin and enable access to the Administration menu:

```bash
cd backend
npm run promote-admin <username>
```

For example:
```bash
npm run promote-admin dash-admin
```

After promoting a user to admin, they will need to log out and log back in for the changes to take effect. Once logged in as an admin, they will see the "Administration" section in the sidebar with access to:
- Admin Dashboard
- User Management
- Configuration
- Audit Logs

## Configuration

### JumpCloud
1. Obtain an API key from JumpCloud admin portal
2. Add to `.env` file: `JUMPCLOUD_API_KEY` and `JUMPCLOUD_ORG_ID`

### Okta
1. Create an API token in Okta admin console
2. Add to `.env` file: `OKTA_DOMAIN` and `OKTA_API_TOKEN`

### Active Directory
1. Create a service account with appropriate permissions
2. Add LDAP connection details to `.env` file

### TP-Link Omada
1. Ensure Omada controller is accessible from the dashboard
2. Create a dedicated API user with admin privileges
3. Add connection details to `.env` file

## API Documentation

Once running, API documentation is available at:
- Swagger UI: http://localhost:3001/api-docs

## Security Considerations

- All credentials are stored as environment variables
- JWT-based authentication for dashboard access
- API keys are never exposed to the frontend
- All external API communications use HTTPS
- Regular security audits recommended

## Project Structure

```
admin-dashboard/
├── frontend/           # React frontend application
├── backend/            # Express backend API
├── docker/             # Docker configurations
├── docs/               # Additional documentation
├── docker-compose.yml  # Container orchestration
└── .env.example        # Environment variables template
```

## Contributing

This is a personal homelab project, but suggestions and improvements are welcome.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please open an issue on the repository.
# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login

Login to get JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string"
    }
  }
}
```

#### POST /auth/register

Register a new user.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string"
}
```

### Account Management

#### GET /accounts/search?query=

Search across all identity sources.

**Query Parameters:**
- `query`: Search term (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "source": "jumpcloud|okta|active-directory",
      "type": "user|group",
      "id": "string",
      "displayName": "string",
      "email": "string",
      "username": "string",
      "attributes": {}
    }
  ]
}
```

#### GET /accounts/:identifier

Get unified account view.

**Query Parameters:**
- `source`: Optional source filter (jumpcloud|okta|active-directory)

**Response:**
```json
{
  "success": true,
  "data": {
    "primarySource": "jumpcloud|okta|active-directory",
    "accounts": [],
    "mfaDevices": []
  }
}
```

#### PUT /accounts/:source/:sourceId

Update account information.

**Request Body:**
```json
{
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "enabled": boolean
}
```

#### POST /accounts/:source/:sourceId/expire-password

Expire user password to force reset.

#### POST /accounts/:source/:sourceId/reset-mfa

Reset MFA devices for user.

**Request Body (optional):**
```json
{
  "factorId": "string"
}
```

#### POST /accounts/:source/:sourceId/suspend

Suspend user account.

### Network Management

#### GET /network/devices

Get all network devices.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "mac": "string",
      "ip": "string",
      "type": "string",
      "model": "string",
      "status": "online|offline|disconnected",
      "uptime": number,
      "firmwareVersion": "string"
    }
  ]
}
```

#### GET /network/devices/:deviceId

Get specific device details.

#### POST /network/devices/:deviceId/reboot

Reboot a network device.

#### GET /network/clients

Get all network clients.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "mac": "string",
      "ip": "string",
      "name": "string",
      "connected": boolean,
      "wireless": boolean,
      "ssid": "string"
    }
  ]
}
```

#### POST /network/clients/:clientMac/block

Block a network client.

#### POST /network/clients/:clientMac/unblock

Unblock a network client.

#### GET /network/settings

Get site settings.

#### GET /network/wlans

Get configured WLANs.

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Internal server error

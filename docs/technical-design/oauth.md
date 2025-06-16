# OAuth Implementation

## Overview

Our OAuth implementation uses the OAuth 2.0 protocol with the Client Credentials grant type. This is designed for server-to-server authentication where the client application needs to access protected resources on behalf of itself.

## Grant Types

Currently, we only support the `client_credentials` grant type. This is suitable for:
- Server-to-server communication
- Machine-to-machine (M2M) authentication
- Backend services that need to access our API

## Client Registration

OAuth clients can only be created by users with the `ADMIN_USER` role. Each client requires:
- A contact email (required)
- An optional description
- Optional grants array (defaults to `['client_credentials']`)

The system automatically generates:
- A unique client ID (format: `oauth-client-{uuid}`)
- A secure client secret (64 bytes, base64url encoded)

## Token Lifecycle

1. **Token Generation**
   - Tokens are JWTs (JSON Web Tokens)
   - Expiration: 90 days
   - Token type: Bearer

2. **Token Claims**
   ```json
   {
     "sub": "<client_id>",
     "client_id": "<client_id>",
     "grant_type": "client_credentials",
     "iat": <issued_at_timestamp>,
     "exp": <expiration_timestamp>
   }
   ```

3. **Token Refresh**
   - Currently, we don't support token refresh
   - Clients must request a new token when the current one expires

## API Endpoints

### 1. Request Token

**Endpoint:** `POST /oauth/token`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "grant_type": "client_credentials",
  "client_id": "oauth-client-123",
  "client_secret": "your-client-secret" // pragma: allowlist secret
}
```

**Response Examples:**

Success (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvYXV0aC1jbGllbnQtMTIzIiwiY2xpZW50X2lkIjoib2F1dGgtY2xpZW50LTEyMyIsImdyYW50X3R5cGUiOiJjbGllbnRfY3JlZGVudGlhbHMiLCJpYXQiOjE2MTUxMjM0NTYsImV4cCI6MTY0NjY1OTQ1Nn0.signature", // pragma: allowlist secret
  "token_type": "Bearer",
  "expires_in": 7776000
}
```

Missing Credentials (400 Bad Request):
```json
{
  "error": "invalid_request",
  "error_description": "Missing client credentials"
}
```

Invalid JSON (400 Bad Request):
```json
{
  "error": "invalid_request",
  "error_description": "Invalid JSON payload"
}
```

Invalid Credentials (401 Unauthorized):
```json
{
  "error": "invalid_client",
  "error_description": "Invalid client credentials"
}
```

Unauthorized Client (401 Unauthorized):
```json
{
  "error": "unauthorized_client",
  "error_description": "Client is not authorized to use this grant type"
}
```

Server Error (500 Internal Server Error):
```json
{
  "error": "server_error",
  "error_description": "Internal server error"
}
```

### 2. Using the Token

Include the token in the `Authorization` header for all API requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response Examples:**

Success (200 OK):
```json
{
  "data": {
    // API response data
  }
}
```

Invalid Token (401 Unauthorized):
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired token"
}
```

Missing Token (401 Unauthorized):
```json
{
  "error": "unauthorized",
  "error_description": "Missing authorization token"
}
```

## Security Considerations

1. **Client Secret Storage**
   - Client secrets are stored securely in the database
   - They are only shown once during client creation
   - They cannot be retrieved later

2. **Token Security**
   - Tokens expire after 90 days
   - Tokens are stateless (JWT-based)
   - All API requests must use HTTPS

3. **Access Control**
   - Only admin users can create/update/delete OAuth clients
   - Client credentials are required for all token requests
   - Invalid credentials are rejected immediately 
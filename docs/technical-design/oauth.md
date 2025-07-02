# OAuth Implementation

## TL;DR: Quick Start for Integrators

1. **Get your credentials:**  
   You will be provided a `client_id` and `client_secret` by an admin. Save these securely; the secret is only shown once.

2. **Request a token:**  
   Make a POST request to `/oauth/token` with your credentials:
   ```json
   {
     "grant_type": "client_credentials",
     "client_id": "your-client-id",
     "client_secret": "your-client-secret" // pragma: allowlist secret
   }
   ```

3. **Use the token:**  
   Add the returned `access_token` as a Bearer token in the `Authorization` header for all API requests:
   ```
   Authorization: Bearer <access_token>
   ```

4. **Token expiration:**  
   Tokens expire every 90 days. When expired, repeat step 2 to get a new token using the same credentials.

## Overview

Our OAuth implementation uses the OAuth 2.0 protocol with the Client Credentials grant type. This is designed for server-to-server authentication where the client application needs to access protected resources on behalf of itself.

## Grant Types

Currently, we only support the `client_credentials` grant type. This is suitable for:
- Server-to-server communication
- Machine-to-machine (M2M) authentication
- Backend services that need to access our API

## Client Registration

OAuth clients can only be created by users with the `ADMIN_USER` role. Each client requires:
- A CMS user to be attached to the client(required)
- An optional description
- Optional grants array (defaults to `['client_credentials']`)

The system automatically generates:
- A unique client ID (format: `oauth-client-{uuid}`)
- A secure client secret (64 bytes, base64url encoded)

### Creating an OAuth Client (for ADMIN_USER)

Only users with the `ADMIN_USER` role can create OAuth clients. This is done via the MC-Review setting page in the state portal.

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
   - **Note:** In the `client_credentials` (machine-to-machine) flow, refresh tokens are not used. When a token expires, the client should simply request a new access token using its client credentials. This is standard practice for M2M OAuth 2.0 implementations.
   - **Example:**
     If your access token expires, just repeat the `/oauth/token` request with your `client_id` and `client_secret` to obtain a new token.
   - Currently, we don't support token refresh.
   - Clients must request a new token when the current one expires.

## API Endpoints

### 1. Request Token

**Endpoint:** `POST https://{deployment-api-domain}/oauth/token`

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Request Body:**
```application/x-www-form-urlencoded
grant_type=client_credentials&client_id=oauth-client-123&client_secret=your-client-secret
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

**Endpoint:** `POST https://{deployment-api-domain}/v1/graphql/external`

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
   - Client id and secrets are displayed in a secure table on the state portal accessible only to admin users

2. **Token Security**
   - Tokens expire after 90 days
   - Tokens are stateless (JWT-based)
   - All API requests must use HTTPS

3. **Access Control**
   - Only admin users can create/update/view/delete OAuth clients
   - Client credentials are required for all token requests
   - Invalid credentials are rejected immediately 

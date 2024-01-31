# Third Party API Access

## Overview
In order to make a request to the API, users (3rd party and non) need to be authenticated (signed in) and authorized (have permission to make a particular request). Non 3rd party users are both authenticated and authorized with Cognito. While 3rd party users will be able to authenticate with cognito, authorization will happen separately that we can grant them longer term credentials for authorization.

## Process for 3rd Parties to Use the MC-Review API

1. 3rd party is authenticated (signs on)
2. 3rd party requests a JWT 
3. 3rd party uses the JWT to make a request to the MC-Review API 
4. Request is sent to `v1/graphql/external` via the `graphql` API gateway endpoint, which invokes the lambda authorizer 
5. The lambda authorizer, `third_party_api_authorizer`, verifies the JWT that the 3rd party sent with their request. If the JWT is valid (valid user, and not expired) the lambda returns an “allow” policy document, otherwise it returns a “deny”. This policy determines if the request can proceed.
6. When authorization is successful the user ID that was granted the JWT is used to fetch a full user record from postgres. This is user is then a part of the context for the resolver.

## JWT Security
Like previously mentioned, third parties will need to have a valid JWT in order to access the MC-Review API. More can be found on JWT security [here](api-jwt-security.md) 
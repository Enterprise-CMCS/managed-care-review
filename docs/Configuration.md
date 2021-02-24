# Application Configuration

guide-wire is [configured using env vars](https://12factor.net/config).

Different env vars can be set in different environments [local dev, review apps, dev, staging, prod] to configure things differently.

For local dev, ./dev loads all environment variables set in the `.env` file. `.env_example` is provided (and copied as a default on first run) with settings that should work out of the box locally.

Also, CreateReactApp only loads env vars that start with `REACT_APP_`, so any configuration that needs to be read by app-web must start that way.

## List of Environment Variables

### `REACT_APP_LOCAL_LOGIN`

Read by `app-api` and `app-web`.

valid values: `true`. Anything else is interpreteed as false

if set to `true`, Cognito auth is bypassed alltogether. api-web presents a list of users and sends user info to api-web in a header on every request. _This should never be set outside of local dev_

### `REACT_APP_API_URL`

Read by `app-web`

valid values: A URL where app-api is running

This is the base URL that all requests are sent to from app-web

### `REACT_APP_COGNITO_*`

Read by `app-api`

-   REACT_APP_COGNITO_REGION
-   REACT_APP_COGNITO_ID_POOL_ID
-   REACT_APP_COGNITO_USER_POOL_ID
-   REACT_APP_COGNITO_USER_POOL_CLIENT_ID

These four env vars configure cognito auth from the browser. They are ignored if `REACT_APP_LOCAL_LOGIN` is set to `true` and thus are only set in deployed environments.

### `APPLICATION_ENDPOINT`

Read by nightwatch

valid values: A URL where a running app-web can be reached

This is used by nightwatch to configure where it tries to reach the app to conduct its testing. Run it locally with ./dev test

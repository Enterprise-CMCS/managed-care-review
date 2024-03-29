# ui-auth

This service connects our frontend, backend, and upload service to each other and to our Amazon Cognito user authentication.

### Amplify

It's worth noting that Amplify's Storage interface, which wraps S3, puts files into potentially 3 different subdirectories in our s3 storage based on what access level you give them: "public", "protected", or "private".

/allusers is where "public" files go, accessible to all authenticated users of the system
/protected is where files that are meant to be shared between some users go (we don't support this right now)
/private is where files scoped to a single user go, and permissions are scoped to fit.

These concepts are explained in detail [in the docs](https://docs.amplify.aws/lib/storage/configureaccess/q/platform/js/).

## Significant dependencies

None.

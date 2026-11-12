# Browser storage API transport

The storage API issues presigned S3 URLs for uploads and downloads and exposes
malware-scan status through GraphQL. File bytes travel directly between the
browser and S3, not through GraphQL. Clients using these URLs do not need Cognito
identity-pool S3 credentials.

GraphQL authenticates and authorizes requests for URLs and scan status. S3
independently validates presigned requests and enforces the bucket's clean-scan
download policy. A valid download URL is not proof that an object is safe to read.

## Contracts

### Uploads

`generateUploadURL` accepts `fileName`, `fileType` and `bucketName` and returns an
upload URL, object key, bucket, expiry, S3 URL and `contentType`. The filename
extension must match the requested file type. The server generates a unique
object key and derives the MIME type from the file type.

Send the returned `contentType` as the PUT's `Content-Type` header.

`includeContentDisposition` is optional and defaults to false. When true, send
these headers on the presigned PUT:

```text
Content-Type: <returned contentType>
Content-Disposition: attachment; filename=<encodeURIComponent(original fileName)>
```

Only the opt-in request signs the attachment header. Upload URLs expire after
300 seconds. The local and deployed upload signers do not sign a checksum for
unknown upload bytes; ordinary SDK uploads use the SDK's default checksum
configuration.

### Scan status

`fetchUploadScanStatus(input: { key, bucketName })` works before a document row is
saved. It reads the object's trusted GuardDuty scan tag:

| Tag                                                 | Result     |
| --------------------------------------------------- | ---------- |
| Absent                                              | `PENDING`  |
| `NO_THREATS_FOUND`                                  | `CLEAN`    |
| `THREATS_FOUND`                                     | `INFECTED` |
| Any other value, including failed/unsupported scans | `ERROR`    |

An S3 lookup failure is a GraphQL error, never a clean or pending result. Clients
must bound polling and handle errors/timeouts explicitly. A successful PUT is not
a successful malware scan.

LocalStack does not run GuardDuty. The local adapter reports `CLEAN` for developer
workflows and must not be used as malware-enforcement evidence.

### Downloads

`fetchS3DownloadURL(input: { key, bucketName })` returns a one-hour presigned GET
URL. The URL can be issued before a scan completes, but S3 still denies the
actual GET unless the object is clean. Signing does not bypass the bucket policy.

## Access boundary

`fetchUploadScanStatus` and `fetchS3DownloadURL` require authenticated human/browser
request contexts. All OAuth client contexts, including delegated and scoped
clients, are denied. Machine clients use `fetchDocument` for document access;
`generateUploadURL` applies its OAuth write and synthetic-data authorization rules
independently.

Keys are limited to flat objects in the authenticated shared
`allusers/` scope. Callers may pass a bare key or one `allusers/` prefix. Private,
nested, traversal, control-character and ZIP paths are rejected. The complete
S3 key, including the prefix, must fit S3's 1024-byte UTF-8 key limit.

These raw-key queries provide shared-object access, **not** package-level
ownership checks. Key validation is not content or file-size validation. ZIP
downloads use `DocumentZipPackage.downloadUrl` from an authorized package fetch;
do not route raw ZIP keys through `fetchS3DownloadURL`.

## Implementation locations

- `services/app-graphql/src/schema.graphql`: operation inputs, response types and
  scan-status values.
- `services/app-api/src/resolvers/documents/generateUploadURL.ts`: upload
  authorization, filename/type validation and object-key generation.
- `services/app-api/src/resolvers/documents/sharedS3Objects.ts`: human-only scan
  and download queries and shared-key validation.
- `services/app-api/src/s3/s3Deployed.ts` and `s3Local.ts`: URL signing and scan-tag
  adapters.
- `services/infra-cdk/lib/stacks/app-api.ts` and
  `services/app-api/src/cors/configureCorsHelpers.ts`: API CORS configuration.

## Testing and maintenance

### Offline checks

From the repository root:

```sh
# Generation does not require connecting to Postgres. Supply a safe local URL
# if required by the Prisma configuration; do not reset or migrate a real DB.
pnpm -r generate
pnpm build:packages
VITE_APP_AUTH_MODE=LOCAL AWS_EC2_METADATA_DISABLED=true pnpm --filter app-api test:once \
  src/resolvers/documents/generateUploadURL.test.ts \
  src/resolvers/documents/sharedS3Objects.test.ts \
  src/s3/s3Deployed.test.ts src/s3/s3Presigning.test.ts \
  src/oauth/oauthAuthorization.test.ts src/cors/configureCorsHelpers.test.ts
pnpm --filter mcr-infra-cdk exec tsc --noEmit
pnpm --filter app-api build
pnpm --filter app-web exec tsc --noEmit
```

The query tests exercise the actual schema and `configureResolvers` registration
without connecting to a database. Real-SDK presigning tests use fake credentials
and no network. They do not prove deployed CORS, permissions or scanning.

### Deployed browser smoke

`services/cypress/integration/smokeTest/apiStorage.spec.ts` runs in the review CI
workflow against an isolated AWS deployment. Its authentication helper uses human
Cognito test users and requires the test password, Cognito IDs/region, API URL
and temporary CI AWS credentials configured by that workflow. S3 transfers use
presigned URLs rather than direct S3 test credentials.

For a targeted run from `services/cypress`, supply those settings through the
approved environment configuration and set `VITE_APP_AUTH_MODE=AWS_COGNITO`:

```sh
pnpm exec cypress run \
  --spec integration/smokeTest/apiStorage.spec.ts \
  --config baseUrl=https://YOUR-ISOLATED-TEST-HOST
```

The spec executes actual S3 PUT/GET using the application-origin window's fetch,
so success exercises browser CORS rather than only a Node HTTP client. It checks:

- Deployed API OPTIONS explicitly permits each browser-set SigV4 request header,
  including `x-amz-content-sha256`.
- Nonempty clean PDF round trips and SHA-256 equality in both buckets.
- Default upload requests and opt-in attachment headers in both buckets.
- Real scan completion with bounded polling.
- Deployed-only EICAR detection and actual S3 GET denial in both buckets.

Local mode excludes the EICAR cases because its scan adapter is a stub; it does
not validate malware enforcement. The deployed cases fail on unexpected verdicts,
timeouts, network/CORS failures or a download that is not denied. A generic
network failure is not proof that an infected object is protected.

When using local browser doubles, serve the application, GraphQL API and S3 from
separate origins. A same-origin GraphQL double does not exercise API preflight,
even if the S3 double is cross-origin. Doubles do not validate AWS IAM, actual
presigning or GuardDuty.

### Troubleshooting and safe diagnostics

The Cypress signed GraphQL helper adds `x-amz-content-sha256`. API Gateway
preflight, gateway error responses and Lambda CORS headers must allow that
header. Header allowlists do not replace IAM authorization or origin validation.
A missing preflight header blocks the browser before GraphQL and can appear as a
`TypeError`. For failures at `current-user`, inspect API preflight before
investigating S3 permissions or scanning.

Smoke failures identify the operation (`authentication`, `current-user`,
`generate-upload`, `put`, `scan`, `download-url`, `get`, or `checksum`) and retain
only allowlisted error names/GraphQL codes and numeric HTTP status. Raw error
messages, stacks and causes are not copied, because they may contain bearer URLs
or credentials. Metadata is captured before the shared Apollo wrapper flattens
errors. The diagnostic spec tests this redaction separately from storage access.

Treat network captures, videos and other test artifacts as potentially containing
presigned bearer URLs; command-log suppression is not universal redaction.

The smoke creates unsaved upload objects with unique keys. It does not create
contracts, change bucket policy or forge scan tags. No delete-object API exists
in this test path: use the test bucket's lifecycle or approved operator cleanup.

### Related regression coverage

Changes to storage behavior also require exercising saved-document/Q&A downloads
and authorized package ZIP downloads in an isolated AWS environment. Verify
absent/nonclean/unknown tag denial using approved stable fixtures where required;
mocked tag-mapping tests do not validate bucket-policy enforcement. Record the
tested revision and environment with the results so failures can be reproduced.

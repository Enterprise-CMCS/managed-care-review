# Browser storage API transport

This additive backend change prepares browser file transfers to work without
Cognito identity-pool S3 credentials. It does not change browser login, select a
new frontend storage adapter, replace REST/WAF, or change external API contracts.

## Contracts

### Uploads

Reuse `generateUploadURL` with the existing filename, file type and bucket inputs.
The response additionally provides `contentType`. Existing operations do not need
to select that field and their existing PUT requests remain valid.

`includeContentDisposition` is optional and defaults to false. When true, send
these headers on the presigned PUT:

```text
Content-Type: <returned contentType>
Content-Disposition: attachment; filename=<encodeURIComponent(original fileName)>
```

Only the opt-in request signs the attachment header. Presigned URLs expire after
300 seconds. File bytes travel directly between the browser and S3, not through
GraphQL. The local and deployed upload signers do not sign a checksum for unknown
upload bytes; ordinary SDK uploads retain their existing checksum configuration.

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

Both new queries are for authenticated human/browser request contexts. All OAuth
client contexts, including delegated and scoped clients, are denied. Machine
clients retain the existing `fetchDocument` and upload authorization contracts.

Keys are limited to flat objects in the existing authenticated shared
`allusers/` scope. Callers may pass a bare key or one `allusers/` prefix. Private,
nested, traversal, control-character and ZIP paths are rejected. The complete
S3 key, including the prefix, must fit S3's 1024-byte UTF-8 key limit.

This preserves shared-object browser access; it does **not** introduce package
ownership checks or stronger content/size validation. ZIP downloads continue to
use `DocumentZipPackage.downloadUrl` from an authorized package fetch. Do not
route raw ZIP keys through the new query.

## Pre-merge validation

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

### Deployed review smoke

`services/cypress/integration/smokeTest/apiStorage.spec.ts` is discovered by the
existing review workflow. It uses current human Cognito test auth, not OIDC or a
storage rollout flag. It requires the usual isolated review deployment, test
password, Cognito IDs/region, API URL and temporary CI AWS credentials already
provided by that workflow. No extra direct S3 test credentials are introduced.

For a targeted run from `services/cypress`, inject those approved test settings
and set `VITE_APP_AUTH_MODE=AWS_COGNITO`, then run:

```sh
pnpm exec cypress run \
  --spec integration/smokeTest/apiStorage.spec.ts \
  --config baseUrl=https://YOUR-ISOLATED-REVIEW-HOST
```

The spec executes actual S3 PUT/GET using the application-origin window's fetch,
so success exercises browser CORS rather than only a Node HTTP client. It checks:

- Deployed API OPTIONS explicitly permits each browser-set SigV4 request header,
  including `x-amz-content-sha256`.
- Nonempty clean PDF round trips and SHA-256 equality in both buckets.
- Default upload requests and opt-in attachment headers in both buckets.
- Real scan completion with bounded polling.
- Deployed-only EICAR detection and actual S3 GET denial in both buckets.

The signed GraphQL helper adds `x-amz-content-sha256`. API Gateway preflight,
gateway error responses and Lambda CORS headers allow that header; IAM
authorization and allowed application origins are unchanged. A missing preflight
header blocks the browser before GraphQL and can appear as a `TypeError`.

Local mode excludes the EICAR cases because its scan adapter is a stub; it is not
deployed security proof. The deployed cases fail on unexpected verdicts, timeouts,
network/CORS failures or a download that is not denied. They do not treat generic
network failure as proof that an infected object is protected.

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
in this test path: use the established review bucket lifecycle/operator cleanup.

### Remaining release evidence

Before merge, record the exact tested commit and deployed review results. Also
exercise existing saved-document/Q&A and authorized package ZIP downloads on the
candidate. Verify absent/nonclean/unknown tag denial using approved stable
fixtures where required; mocked mapping tests are not live IAM evidence.

Code deployment and later frontend enrollment remain separate. Merge immediately
promotes to production: do not rely on first testing this in Val after merge.

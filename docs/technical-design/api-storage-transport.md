# Browser storage API transport

GraphQL provides upload/download URLs and malware-scan status. The browser sends
file bytes directly to S3 using those presigned URLs; it does not need Cognito
identity-pool S3 credentials for the transfers.

The upload and download flows are separate:

- **Upload:** request an upload URL → PUT the file to S3 → wait for the scan result.
- **Download:** request a download URL → GET the file from S3. This is only needed
  when retrieving a file, not as part of completing an upload.

GraphQL controls access to these operations, while S3 validates the signed
requests and enforces the clean-scan download policy.

## API contracts

### Upload

`generateUploadURL` accepts `fileName`, `fileType` and `bucketName`. It returns a
five-minute PUT URL, a generated object key and `contentType`. The filename
extension must match the requested file type.

Always send the returned `contentType` as `Content-Type`. If
`includeContentDisposition: true` was requested, also send the matching header:

```text
Content-Disposition: attachment; filename=<encodeURIComponent(fileName)>
```

That option defaults to false, so other callers can omit the attachment header.
The URL signer must not add a checksum calculated from an empty body: the browser
supplies the actual bytes later. Ordinary SDK uploads keep their default checksums.

### Scan status

`fetchUploadScanStatus(input: { key, bucketName })` works before a document record is
saved. It reads the object's GuardDuty scan tag:

| GuardDuty tag                          | API result |
| -------------------------------------- | ---------- |
| Absent                                 | `PENDING`  |
| `NO_THREATS_FOUND`                     | `CLEAN`    |
| `THREATS_FOUND`                        | `INFECTED` |
| Failed, unsupported or unknown verdict | `ERROR`    |

Clients must limit polling and handle failures. An S3 lookup failure is a GraphQL
error, not `PENDING`; a successful PUT does not mean scanning is complete.
LocalStack does not run GuardDuty, so the local adapter simulates `CLEAN`.

### Download

`fetchS3DownloadURL(input: { key, bucketName })` returns a one-hour GET URL. It can be
issued before scanning finishes, but **S3 denies the download unless the object
is clean**. Possessing a signed URL does not bypass that policy.

## Access boundaries

- The scan and download queries allow all authenticated human roles. They provide
  **shared-object access, not document ownership or state-assignment checks**.
- OAuth clients, including delegated clients, cannot use those two queries.
  OAuth uploads through `generateUploadURL` have separate write-permission rules;
  machine clients use `fetchDocument` for document access.
- The buckets are `HEALTH_PLAN_DOCS` and `QUESTION_ANSWER_DOCS`. Keys must be flat
  filenames, optionally prefixed with `allusers/`. Private, nested, traversal,
  control-character and ZIP paths are rejected. The complete key, including the
  prefix, must fit S3's 1024-byte UTF-8 limit.
- Key validation is not content or file-size validation. ZIP downloads use
  `DocumentZipPackage.downloadUrl` through an authorized package fetch.

## Where to find the implementation

- `services/app-graphql/src/schema.graphql`: inputs, response types and scan states.
- `services/app-api/src/resolvers/documents/`: `generateUploadURL.ts` handles
  uploads; `sharedS3Objects.ts` handles scan/download access and key validation.
- `services/app-api/src/s3/`: `s3Deployed.ts` signs URLs and reads scan tags;
  `s3Local.ts` supplies the development adapter.
- `services/infra-cdk/lib/stacks/app-api.ts` and
  `services/app-api/src/cors/configureCorsHelpers.ts`: API CORS configuration.

## Testing and troubleshooting

The API tests beside the resolvers and S3 adapters cover schema validation,
authorization, scan results and signing. `s3Presigning.test.ts` uses the real SDK
with fake credentials and no S3 requests to catch SDK-added checksum behavior.
These tests do not verify deployed permissions, CORS or GuardDuty.

`services/cypress/integration/smokeTest/apiStorage.spec.ts` tests those deployed
connections using human Cognito test auth and the review CI environment settings.
It deliberately combines upload and download into a test round trip to compare
clean-file SHA-256 hashes. It also checks both buckets, attachment headers, and
EICAR detection followed by an actual denied GET. S3 transfers use the application
window's fetch so browser CORS rules apply. It does not test the React upload UI
or per-document authorization.

When maintaining this path:

- **Check API preflight for early failures.** The signed GraphQL helper sends
  `x-amz-content-sha256`; API Gateway and Lambda CORS configuration must allow it.
  A missing header can produce `current-user (TypeError)` before GraphQL runs.
- **Keep browser doubles cross-origin.** Separate application, API and S3 origins
  are needed to exercise CORS. Local mode skips EICAR cases because its simulated
  scan result cannot verify malware protection; a network failure is not proof
  that S3 denied an infected download.
- **Protect signed URLs and credentials.** Diagnostics report the failed step,
  known error codes and HTTP status rather than raw messages or stacks. Network
  captures and other test artifacts may still contain usable signed URLs.
- **Account for test objects.** The smoke uploads files without saving document
  records and does not delete them; use the test bucket's lifecycle or approved
  operator cleanup.
- **Check related workflows after storage changes.** Exercise saved-document/Q&A
  and authorized package ZIP downloads in AWS. For shared objects, also verify
  denial for absent or nonclean scan tags. Record the tested revision and
  environment with the results.

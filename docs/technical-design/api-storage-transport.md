# Browser storage API transport

GraphQL provides upload/download URLs and malware-scan status. File bytes travel
directly between the browser and S3; the API does not proxy them. For API-backed
transfers, the presigned URL carries S3 authorization instead of the browser's
Cognito identity-pool credentials.

The upload and download flows are separate:

- **Upload:** request an upload URL → PUT the file to S3 → wait for the scan result.
- **Download:** request a download URL → GET the file from S3.

GraphQL controls access to these operations, while S3 validates the signed
requests and enforces the clean-scan download policy. GraphQL requests retain
the application's existing authentication; a presigned URL authorizes a specific
S3 operation, not an application session.

## Storage layout

`HEALTH_PLAN_DOCS` and `QUESTION_ANSWER_DOCS` select the stage's document and Q&A
buckets. The API generates a key such as `<uuid>.pdf`; the deployed S3 adapter
stores it at `allusers/<uuid>.pdf`. The shared scan/download APIs accept that flat
key with or without the `allusers/` prefix.

The stored `s3://<bucket>/<key>/<original filename>` reference is legacy document
metadata, not the physical object path or a fetchable URL. Use the key parser or
the document's stored key rather than treating the entire reference as an S3 key.

Package ZIPs live under `zips/` and use package-authorized resolvers. The buckets
also support identity-private prefixes for Cognito storage, but those paths are
not exposed by the shared scan/download APIs.

## API contracts

### Upload

`generateUploadURL` accepts `fileName`, `fileType` and `bucketName`. It returns a
five-minute PUT URL, a generated object key and `contentType`. The filename
extension must match the requested file type.

Always send the returned `contentType` as `Content-Type` and `If-None-Match: *`.
The precondition is signed and bucket-enforced: a repeated PUT must return 412,
not replace an existing document. Request a fresh URL/key for a replacement.
If `includeContentDisposition: true` was requested, also send the matching header:

```text
Content-Disposition: attachment; filename=<encodeURIComponent(fileName)>
```

That option defaults to false, so other callers can omit the attachment header.
The URL signer must not add a checksum calculated from an empty body: the browser
supplies the actual bytes later. Ordinary SDK uploads keep their default checksums.

The React storage adapter uses these GraphQL APIs for upload contracts, scan
status and download URLs. Apollo requests use the application's Cognito/IAM API
transport; file bytes travel directly between the browser and S3. Attachment
metadata and the create-only precondition are preserved. This API uses a single
PUT, not multipart uploads; files must fit S3's single-PUT limit (5 GB).

Supported file types are PDF, DOC, DOCX, XLS, XLSX, XLSM, XLTM, XLAM and CSV.

### Scan status

`fetchUploadScanStatus(input: { key, bucketName })` works before a document record is
saved. It reads the object's GuardDuty scan tag:

| GuardDuty tag                          | API result |
| -------------------------------------- | ---------- |
| Absent                                 | `PENDING`  |
| `NO_THREATS_FOUND`                     | `CLEAN`    |
| `THREATS_FOUND`                        | `INFECTED` |
| Failed, unsupported or unknown verdict | `ERROR`    |

The browser waits three seconds before the first status query, then polls with
exponential backoff capped at 15 seconds and a one-minute total deadline. Each
query bypasses Apollo's cache. Only `CLEAN` completes the upload; other terminal
results, missing results, lookup errors and timeouts produce a scan error.
Document rows are saved after the upload and scan complete.

Removing or replacing a file, or leaving the upload component, cancels its work.
The legacy GraphQL transport can finish an already-issued request, but its result
is ignored after cancellation and no further polls start. LocalStack does not run
GuardDuty; the local adapter simulates scan completion.

### Download

`fetchS3DownloadURL(input: { key, bucketName })` returns a one-hour GET URL. It can be
issued before scanning finishes, but **S3 denies the download unless the object
is clean**. Possessing a signed URL does not bypass that policy.

The browser requests fresh URLs without caching them. Saved-document links use
the URL supplied by their parent query; activating an expired or nearly expired
link requests a replacement by key and bucket. Q&A links use the Q&A bucket.
ZIP links renew by refetching the active authorized parent query containing the
same ZIP package ID, rather than requesting a shared-object URL for a ZIP key.

Valid links retain normal navigation. Renewal opens an isolated blank tab during
the click and navigates it after a fresh URL arrives; failure or a 30-second
renewal timeout closes the tab and displays an accessible error. Signed URLs are
not sent to link analytics. Keyboard and middle-click activation use the same
renewal path; context-menu actions use the link's current URL.

## Access boundaries

- The scan and download queries allow all authenticated user roles. They provide
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

## S3 enforcement

Both buckets enforce integrity through resource-policy denies, so the controls
also apply when a principal's IAM role has broader permissions. This matters in
persistent environments where the Cognito identity role is imported rather than
managed by this stack.

- **Document writes are create-only.** All writers, including API-presigned
  requests, must send `If-None-Match: *` when creating objects under `allusers/`
  or `private/`. Reusing a key cannot replace bytes associated with a scan verdict.
  Multipart completion has the same requirement; initiation and part uploads do
  not carry the precondition. The browser API itself uses a single PUT.
- **Browser credentials have a narrower boundary.** Cognito identity-pool sessions
  may read objects, upload to `allusers/` or their own private prefix, list
  multipart parts and abort multipart uploads. Object management, server-side
  copies and tagging are denied. The policy identifies Cognito-issued role
  sessions with the global [`aws:FederatedProvider`](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-federatedprovider)
  key set to `cognito-identity.amazonaws.com`. Private paths still use the
  `cognito-identity.amazonaws.com:sub` policy variable: the identity-pool identity
  ID, not the user-pool user ID.
- **GuardDuty owns scan verdicts.** Only the stage's
  `GuardDutyMalwareProtectionPassRole-<stage>` role may replace or delete object
  tags, including version tags. Other writers cannot supply
  `GuardDutyMalwareScanStatus` during object creation. The exception matches the
  IAM role ARN through `aws:PrincipalArn`, not an STS session ARN.
- **Downloads require a clean verdict.** Current and versioned object reads are
  denied unless the tag is `NO_THREATS_FOUND`. The scanner role is exempt so it
  can read new objects and perform bucket validation. Backend scan-status tag
  reads remain available; signing a GET does not bypass the download policy.
- **ZIP generation is separate from document creation.** Backend ZIPs under
  `zips/` can be regenerated at deterministic keys; they are outside the
  create-only document prefixes. Their downloads still require a clean scan.

These policies protect stored bytes and scan tags. Application access rules,
including the shared-object versus package authorization boundary, remain the
responsibility of the GraphQL resolvers.

## Where to find the implementation

- `services/app-graphql/src/schema.graphql`: inputs, response types and scan states.
- `services/app-api/src/resolvers/documents/`: `generateUploadURL.ts` handles
  uploads; `sharedS3Objects.ts` handles scan/download access and key validation.
- `services/app-api/src/s3/`: `s3Deployed.ts` signs URLs and reads scan tags;
  `s3Local.ts` supplies the development adapter.
- `services/app-web/src/s3/s3Api.ts`: API-backed browser storage and bounded scan
  polling. `s3Local.ts` retains the local storage implementation.
- `services/app-web/src/components/DownloadLink/` and
  `services/app-web/src/helpers/renewZipDownload.ts`: activation-time renewal.
- `services/app-web/src/components/FileUpload/`: per-file cancellation and scan
  state. `hooks/useFileUpload.ts` filters incomplete/error documents before save.
- `services/infra-cdk/lib/stacks/uploads.ts`: bucket policies, object prefixes,
  file-type restrictions and S3 CORS configuration.
- `services/infra-cdk/lib/stacks/virus-scanning.ts`: GuardDuty plans, scanner role
  and scan-result tagging.
- `services/infra-cdk/lib/stacks/cognito.ts`: browser identity-role permissions.
- `services/infra-cdk/lib/stacks/app-api.ts` and
  `services/app-api/src/cors/configureCorsHelpers.ts`: API CORS configuration.

## Deployment constraints

The upload contract and bucket policies must agree. Deploy compatible API and
upload consumers before enforcing the create-only policy on an existing
environment; old browser tabs, external clients and previously signed PUT URLs
missing the precondition fail closed. The normal all-stack workflow deploys
uploads early, so use a coordinated staged rollout or maintenance window rather
than assuming an uninterrupted live cutover.

Before enforcing these policies in an existing environment:

- Confirm both GuardDuty plans use the expected stage scanner role and have
  scan-result tagging enabled. The bucket exceptions depend on that exact role;
  verify its trust and permissions as well as the plan configuration.
- Account for existing objects and in-flight multipart uploads. A policy change
  does not rescan existing bytes or establish the provenance of older scan tags.
  Any rescan, multipart abort or cleanup needs an approved operational plan.
- Check the synthesized infrastructure diff for unintended bucket or role
  replacement, and verify external consumers send the signed upload headers.
- Validate deployed CORS, conditional PUT rejection, scanner access, clean-only
  downloads and ZIP regeneration. Offline tests cannot establish these behaviors
  in an AWS environment.

## Testing and troubleshooting

The API tests beside the resolvers and S3 adapters cover schema validation,
authorization, scan results and signing. `s3Presigning.test.ts` uses the real SDK
with fake credentials and no S3 requests to catch SDK-added checksum behavior.
These tests do not verify deployed permissions, CORS or GuardDuty.

`services/cypress/integration/smokeTest/apiStorage.spec.ts` tests those deployed
connections using Cognito test users and the review CI environment settings.
It deliberately combines upload and download into a test round trip to compare
clean-file SHA-256 hashes. It also checks replayed PUT rejection (412), both buckets, attachment headers, and
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

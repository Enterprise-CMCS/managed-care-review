# Direct Okta OIDC migration: working plan

**Status:** Working plan. Standalone Phase 2 storage implementation is on the current branch behind a default-off flag; deployed validation and the OIDC phases remain pending.  
**Epic:** MCR-6305 — OIDC Migration  
**Starting point:** [June 2026 migration proposal](https://app.notion.com/p/mc-review/OIDC-Migration-3874f9e180fa8007b99dfcf8b2678ef6)  
**Owners:** TBD

## Goal and agreed direction

Move MC-Review browser authentication from SAML through Cognito to **direct Okta OIDC**, stabilize it, and then introduce OAuth on-behalf-of (OBO) access for ARMS as a separate project.

ARMS is a .NET application that currently reads rate submission data through our GraphQL API. Its existing authentication and read-only access must continue working throughout this migration. This is not the MuleSoft/Salesforce integration; do not carry over that integration's token-source or delegation assumptions.

The implementation approach below is a proposal. Each phase must be independently deployable and validated before the next behavior change. No scheduled outage or forced mass logout is the target, not an already-proven guarantee.

## Scope

### Include in this migration

- Direct Okta browser login using Authorization Code + PKCE.
- Validated Okta access tokens for human API requests.
- Preservation of existing application users, permissions, assignments, and history.
- S3 uploads/downloads without browser Cognito credentials.
- Real identity-provider browser integration tests.
- Controlled rollout, coexistence, rollback, and deliberate Cognito retirement.

### Keep unchanged initially

- REST API Gateway and its WAF protection.
- Existing Cognito/SigV4 API route and active legacy sessions.
- ARMS's existing external API authentication, token issuance, and read-only restrictions.
- S3's fail-closed malware-scan enforcement.

### Defer

- HTTP API Gateway migration and associated cost optimization.
- EventBridge-driven persistent malware-scan status redesign.
- OBO implementation, token exchange, and ARMS delegation changes.
- Unrelated infrastructure refactors or broad dependency upgrades.

## Corrections to the June proposal

| Assumption | Correction and implication |
| --- | --- |
| HTTP API WAF association is an ARN substitution. | AWS does not support direct WAF association for HTTP APIs. Keep REST Gateway for this migration. REST supports JWT validation through a Lambda authorizer. |
| A short HTML cache TTL bounds stale-browser exposure to minutes. | It does not update an already-open tab. Keep old endpoints and infrastructure working during coexistence; do not remap their hostname to a JWT-only backend. |
| Moving accounts/groups into Okta preserves application identity. | Database `User.id` currently comes from Cognito `sub`. Explicitly correlate Okta identities to existing database IDs; do not replace those IDs with Okta subjects. |
| ROPC is the preferred way to enable real-auth CI. | Current OAuth security guidance prohibits ROPC. It also bypasses browser redirect, callback, and PKCE coverage. Agree on an IDM-approved automation approach instead. |
| Scan events can update a document row by `s3Key`. | Upload and scan happen before a document row exists. There are multiple document tables, shared objects, and recreated revision rows. A document-column-only design does not fit this lifecycle. |
| Removing the `app-api` stack removes only the old gateway. | The stack also owns GraphQL, OAuth, and operational Lambdas, roles, and schedules. Remove obsolete resources selectively or deliberately transfer ownership first. |
| The current custom API domain is Regional. | Checked-in code uses `EndpointType.EDGE`. Verify the deployed configuration; a Regional-domain assumption cannot underpin a gateway swap. |

The original 1–2 engineering-week estimate for a broker-retaining approach does **not** apply to this direct-Okta plan. Re-estimate after IDM setup and the identity/API proof of concept.

## Phase 0 — Inventory and IDM agreement

**Purpose:** Establish the live configuration and integration contract without changing user behavior.

### Coordination and AWS work

- [ ] Assign an IDM contact, implementation owner, and rollout owner.
- [ ] Confirm dev/val/prod OIDC registrations, issuer, authorization server, API audience, and scopes.
- [ ] Register exact browser callback and logout URLs for direct SPA PKCE login. These are not Cognito's broker callback URLs.
- [ ] Agree on required name, email, role/group, and state claims, including missing/removed-claim behavior.
- [ ] Cover all current application roles, including `READONLY_USER`; the June proposal listed only six role/group combinations.
- [ ] Obtain an authoritative identity-correlation mechanism between existing Cognito-backed users and Okta subjects. Do not use email-only automatic linking.
- [ ] Agree on approved test accounts, authentication policies, browser automation, and review-environment redirect handling.
- [ ] Record future ARMS OBO needs with IDM so initial issuer/audience/client choices do not unnecessarily obstruct token exchange later. Building OBO is not a gate for this migration.
- [ ] Inventory actual Cognito pool/client/domain/identity-pool ownership, schema, token lifetimes, exports, and retention policies. Permanent resources are imported by current CDK, not managed by its review-pool configuration.
- [ ] Verify actual API domain configuration, WAF association, routes, and resource consumers.
- [ ] Record a baseline for login, API errors, uploads/downloads, and ARMS rate reads.

**Environment constraint:** QA shares Val's Cognito resources; treat legacy-auth changes as a shared blast radius. Review environments currently use direct test-user login and do not establish IDM federation coverage.

**Exit gate:** Written integration contract, configuration inventory, test strategy, and identity-correlation source. No live credentials or tokens in this document or test reports.

## Phase 1 — Canonical user identity and additive API support

**Purpose:** Make the backend ready for OIDC without changing the default browser login.

### Proposed implementation

- [ ] Design an additive mapping from validated `(issuer, subject)` to the existing database `User.id`.
- [ ] Preserve existing user IDs and all foreign-key relationships; do not rewrite historical actors or assignments.
- [ ] Make correlation/backfill auditable, idempotent, and uniqueness-constrained. Stop for ambiguous identities rather than merging them automatically.
- [ ] Define behavior for new users, dormant users, and users first appearing through either path during coexistence; prevent duplicate account creation and races.
- [ ] Define the authorization source for roles/state versus application-managed assignments, including role removal and account disablement.
- [ ] Add a separate human bearer-authenticated GraphQL route on the existing REST API. Route name is TBD; retain the old SigV4 route unchanged.
- [ ] Validate approved issuer, signature/JWKS, algorithm, API audience, expiry, and required scopes using a maintained JWT library. Reject ID tokens as API credentials.
- [ ] Adapt GraphQL request context to resolve the canonical human user. Do not reuse machine-client/delegation context as though it were human login.
- [ ] Preserve the current ARMS token endpoint, external GraphQL authorizer, and read-only behavior. Existing machine tokens are not automatically compatible with Okta validation.
- [ ] Test browser CORS and preflight for success, invalid/expired tokens, insufficient scope, and backend errors.
- [ ] Add distinguishable auth-path metrics and safe logs without recording tokens.

**Exit gate:** A real Okta access token reaches GraphQL as the correct existing user with unchanged assignments/history. Invalid tokens and unauthorized operations fail closed. Existing SigV4 requests and ARMS rate reads continue working; prohibited ARMS writes remain denied.

**Migration rule:** Keep database changes additive through rollout and rollback. Generate any required Prisma migrations with the CLI and review their SQL; do not hand-write migrations.

## Phase 2 — Remove Cognito credentials from S3 transport

**Purpose:** Validate storage changes under the existing login before changing browser authentication. Implementation can overlap Phase 1 if file ownership is separated.

**Agreed immediate scope:** Independently mergeable storage migration with backend-mediated S3 access and browser polling of a GraphQL scan-status query. No IDM/OIDC setup is required to deploy it. S3 file bytes still move directly between the browser and S3 through presigned URLs; the API handles authorization, URL issuance, and status checks, not file proxying. Keep current login and GraphQL request authentication unchanged.

- [x] Reuse the existing `generateUploadURL` mutation; preserve its inputs and existing response fields for other API consumers. Any contract enhancement must be backward-compatible; do not add a redundant presigned-upload endpoint.
- [x] Replace Amplify `Storage.put()` with presigned PUT while preserving content type, filename/download metadata, key normalization, expiry, progress, and error handling.
- [x] Replace remaining credential-dependent GET and zip URL consumers with backend-generated URLs.
- [x] Add an authenticated, bucket/key-scoped GraphQL scan-status query that reads trusted GuardDuty scan status through the backend and works before a document is saved. Define how access to the uploaded object is authorized; arbitrary key lookup must not broaden access.
- [x] Replace browser S3 probing with bounded polling of this query: use backoff, stop on terminal status, cancel when the upload is removed or the component unmounts, and show an explicit timeout/retry outcome. A successful PUT is not proof of a clean scan.
- [x] Do not use the current backend `scanFile()` no-op as a scan-success signal.
- [x] Preserve upload-completion/form-continuation gating until the file is confirmed clean.
- [x] Handle pending, nonclean, failed, unknown, and timeout outcomes without treating them as clean.
- [x] Preserve S3 GetObject denial unless GuardDuty reports `NO_THREATS_FOUND`, for both document and Q&A buckets.
- [ ] Verify abandoned uploads, retry behavior, downloads, zips, and existing saved documents.
- [x] Keep the legacy browser storage path usable during coexistence.
- [ ] Create the client-visible `api-s3-storage` LaunchDarkly flag, initially off, and validate both paths in a deployed environment.

### Implemented storage behavior and validation

- Reuses `generateUploadURL`, adding `contentType` and an optional `includeContentDisposition` input (default false). Legacy callers do not acquire a new required PUT header. Presigning does not calculate a checksum for unknown upload bytes. Existing accepted XLTM/XLAM spreadsheet formats remain supported.
- `fetchUploadScanStatus` reads GuardDuty object tags; `fetchS3DownloadURL` signs ordinary and narrowly patterned ZIP downloads. Keys remain in the existing authenticated shared `allusers/` scope (ZIPs only in the document bucket). These endpoints do not introduce package-ownership enforcement.
- The browser polls at most 12 times with capped backoff, with a 60-second overall deadline including in-flight requests. Removal, replacement, and unmount cancel work; timeout offers retry and never permits form continuation. No file bytes pass through GraphQL.
- Storage selection waits for authenticated LaunchDarkly identification and is pinned until reload. Identification failure or a three-second targeting timeout selects legacy storage. Local storage and existing login/API authentication remain intact.
- Focused API/web tests, real offline SDK presigning checks, GraphQL code generation, and both application TypeScript checks pass. Real AWS PUT/header/CORS behavior, GuardDuty tagging, clean-only downloads, Q&A, ZIPs, abandoned uploads, and rollout/rollback still require deployed smoke validation before enabling the flag.

Presigning does not itself add package ownership checks, upload-size enforcement, or byte-level content validation. Document existing guarantees and deliberately scope any additional policy changes.

**Exit gate:** Users can upload, wait for a clean scan, save, download, and obtain zips without browser Cognito S3 credentials. Nonclean/unscanned objects remain inaccessible, and legacy tabs still work.

**Deferred follow-on:** GraphQL subscriptions or another managed push channel, AppSync adoption, and EventBridge-driven persistent scan tracking are outside this phase. Retain the status query for recovery if notifications are added later. If persistent scan status is selected, use an upload/object record that exists at URL issuance rather than relying on saved document rows. Design for duplicate/out-of-order events, object versions, abandoned uploads, and reconciliation.

## Phase 3 — Browser PKCE and session-aware rollout controls

**Purpose:** Ship both login paths before changing defaults.

- [ ] Add Okta Authorization Code + PKCE login, callback handling, deep-link restoration, renewal, expiry, and logout.
- [ ] Define application-session versus upstream Okta-session logout expectations with IDM.
- [ ] Keep the current login, API transport, and storage support available during transition.
- [ ] Add a runtime login-selection control with legacy behavior as the safe initial default.
- [ ] Support pre-login pilot selection; current LaunchDarkly user identification happens after application authentication, so do not assume email targeting alone solves this.
- [ ] Select and retain the auth/API path for the session. Do not switch active requests between SigV4 and bearer based on a live flag change.
- [ ] Define failure behavior if flag/config services are unavailable.
- [ ] Keep the old URL/auth contract intact for already-loaded bundles. Short HTML cache TTL is useful hygiene, not the compatibility mechanism.
- [ ] Implement a safe version-refresh/session-expiry experience without discarding unsaved work during normal rollout.

**Exit gate:** Both session types can coexist. Changing the enrollment default does not break open tabs, in-progress uploads, or active forms.

## Phase 4 — Validation, pilot, and default cutover

### Required test coverage

- [ ] Real Okta browser authorization, redirect, callback, PKCE, deep-link return, renewal, and logout.
- [ ] Existing and new users across every role, including read-only, with state/resource restrictions.
- [ ] Missing/removed claims, ambiguous identity mapping, disabled users, and denied operations.
- [ ] Uploads and malware handling, Q&A documents, downloads, and zips.
- [ ] An old SAML/SigV4 tab and an OIDC tab operating across the same deployment.
- [ ] ARMS token issuance, rate-submission queries, and denied writes unchanged.
- [ ] Tested rollback with active sessions on both paths.

Keep fast local/review tests. Add a real-IDM suite in an approved environment and make its results a promotion gate; do not assume password-grant API calls replace browser coverage. Agree on a stable integration environment if ephemeral callbacks cannot be supported safely.

### Rollout

- [ ] Validate in Dev.
- [ ] Validate Val and QA behavior, accounting for their shared legacy Cognito resources.
- [ ] Enable a small production OIDC pilot.
- [ ] Review auth errors, latency, identity-mapping failures, upload outcomes, and ARMS access against baseline.
- [ ] Change the default for new logins to OIDC.
- [ ] Continue supporting existing legacy and OIDC sessions through the observation window.

### Rollback contract

- Stop new OIDC enrollment and restore the legacy login default.
- Continue serving active OIDC sessions; do not disable their API route as part of ordinary rollback.
- Continue serving legacy sessions and old browser bundles.
- Keep identity mappings and additive schema changes intact.
- Do not delete providers/pools, revoke all sessions, or roll back database IDs as a routine response.
- Treat a security incident requiring token revocation as a separate response, not a promise of disruption-free rollback.

**Exit gate:** Representative production usage on OIDC, acceptable agreed metrics, working ARMS access, and a demonstrated rollback procedure. Define metric thresholds before the pilot.

## Phase 5 — Stabilization and selective cleanup

- [ ] Observe at least the proposed four-week production stability window; agree on the exact period before rollout.
- [ ] Check legacy-auth usage, session/token expiry, and stale-client handling before retirement. Time elapsed alone is insufficient.
- [ ] Confirm no active application path depends on Cognito-issued AWS credentials.
- [ ] Remove legacy frontend paths, Amplify dependencies, and Cognito configuration only when all consumers have migrated.
- [ ] Remove obsolete Cognito permissions/resources through their actual owners, with reviewed change sets and export dependencies.
- [ ] Preserve REST Gateway, WAF, current ARMS OAuth, shared backend Lambdas, operational schedules, and required roles.
- [ ] Do not delete the whole `app-api` stack as gateway cleanup.
- [ ] Document the final configuration and close the migration epic's agreed scope.

After this phase, plan ARMS OBO independently: accepted user subject-token source, authorized exchange client, downstream audience/read scopes, user/resource permissions, and audit attribution. Do not assume OIDC login automatically enables token exchange or supplies particular actor claims.

## Suggested PR boundaries

Each PR should include focused tests, rollout behavior, and evidence that the legacy path is unchanged. Split further if review becomes difficult; these are boundaries, not estimates.

| PR | Scope | TypeScript implementation surface |
| --- | --- | --- |
| 1 | Identity mapping schema/store and reviewed backfill strategy | API, Prisma, tests |
| 2 | Okta token validator and additive REST authorizer/route | API, CDK, tests |
| 3 | Human GraphQL context and role/claim mapping | API, tests |
| 4 | Backend signing/status contracts for unsaved uploads | API, GraphQL, tests |
| 5 | Presigned browser storage adapter under existing login | Web, tests |
| 6 | Browser PKCE/session adapter with legacy default | Web, shared configuration, tests |
| 7 | Real-IDM integration/promotion checks and pilot controls | Cypress, CI, configuration |
| 8 | Post-stability selective cleanup | Web, API, CDK, scripts |

PRs may depend on one another; for example, do not enable the new route for users until canonical identity and context handling are validated. Backend scan support must precede the new upload adapter. Configure IDM/test access early rather than waiting until PR 7 to discover blockers.

## Ownership and collaboration

Keep coordination/operations and implementation as explicit workstreams. Someone can own an infrastructure deliverable without independently authoring the TypeScript change; pair on CDK changes and keep PRs small.

| Workstream | Deliverable | Owner |
| --- | --- | --- |
| IDM coordination | Registrations, claims, correlation source, test policies, future OBO constraints | TBD |
| AWS inventory | Ownership, domains, WAF, lifetimes, exports, retention, drift evidence | TBD |
| TypeScript/API | Identity mapping, token validation, human context, storage/status contracts | TBD |
| TypeScript/web | Storage adapter, PKCE/session handling, rollout controls | TBD |
| Validation | Test accounts, real browser suite, legacy/ARMS regression evidence | TBD |
| Rollout | Metrics, go/no-go, pilot, rollback exercise, cleanup approval | TBD |

## Decisions to work through together

- [ ] Who owns IDM communication, TypeScript implementation, and rollout?
- [ ] What authoritative identifier maps existing users to Okta subjects?
- [ ] Which claims are authoritative for permissions, and how are removals/disablement enforced?
- [ ] What is the new human GraphQL route and trusted request-context contract?
- [ ] How will unsaved-upload status access be authorized?
- [ ] Which environment can run approved real-IDM browser tests before promotion?
- [ ] What pilot mechanism works before authentication?
- [ ] What session lifetimes, legacy retirement criteria, and refresh experience bound coexistence?
- [ ] What metric thresholds stop the pilot or trigger rollback?
- [ ] Which phase can be sized and assigned after the first proof of concept?

## Starting code locations

- `services/infra-cdk/lib/stacks/cognito.ts` — imported permanent resources; Val/QA sharing.
- `services/infra-cdk/lib/stacks/app-api.ts` — REST routes, WAF, domain, authorizer, runtime resource ownership.
- `services/app-api/src/authn/cognitoAuthn.ts` — existing user identity and attribute synchronization.
- `services/app-api/prisma/schema.prisma` — canonical users and relationships.
- `services/app-api/src/handlers/apollo_gql.ts` — authentication-specific request context.
- `services/app-api/src/handlers/third_party_API_authorizer.ts` — existing machine authentication; preserve its contract.
- `services/app-api/src/oauth/oauthAuthorization.ts` — human versus machine permissions.
- `services/app-api/src/resolvers/documents/generateUploadURL.ts` — existing presigned PUT mutation.
- `services/app-api/src/s3/s3Deployed.ts` — signing and current scan stub.
- `services/app-web/src/s3/s3Amplify.ts` — upload/download/scan consumers.
- `services/app-web/src/pages/Auth/cognitoAuth.ts` — current login redirect and session helpers.
- `services/app-web/src/contexts/AuthContext.tsx` — login/session lifecycle and LD identification.
- `services/app-web/src/index.tsx` — build-time configuration and transport initialization.
- `services/cypress/support/loginCommands.ts` — current helpers do not exercise IDM browser federation.

Before implementation, read the repository's API/Cypress skills as applicable and verify these entry points against current code.

## Sources and validation limits

This plan is based on the exported June proposal, read-only repository inspection, and official AWS/Okta/IETF documentation. Live IDM/AWS configuration, protocol flows, rollout timing, and production behavior have not been tested. No implementation or deployed infrastructure changes accompanied this review.

- [AWS REST versus HTTP API features, including WAF and Lambda authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [AWS custom-domain API mappings and Regional-domain requirements](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-mappings.html)
- [AWS JWT authorizer validation requirements](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [Okta Authorization Code + PKCE](https://developer.okta.com/docs/guides/implement-grant-type/authcodepkce/main/)
- [OAuth Security BCP: password grant prohibition](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.4)
- [Okta token exchange, for the later ARMS OBO project](https://developer.okta.com/docs/guides/set-up-token-exchange/main/)

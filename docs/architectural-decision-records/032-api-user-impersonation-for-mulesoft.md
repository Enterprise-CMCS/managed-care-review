---
title: Use header-based impersonation with client-credential restrictions for MuleSoft write access
---

## ADR 0032 — Use header-based impersonation with client-credential restrictions for MuleSoft write access

- Status: Decided
- Drafted: 2026-01-22
- Last Updated: 2026-04-29

## Background

This ADR covers write access for the MuleSoft/Salesforce API integration with MC-Review State Portal. The MC-Review State Portal team initially recommended — and our ISSO approved — Option 3 (RFC 8693 Token Exchange with Okta). Following a cross-team assessment in the following months — involving the MuleSoft and Salesforce team, CMS's IDM team, our business owner and the ISSO — by April 2026 Option 3 was determined to be non-viable. Our ISSO approved the current approach as an alternative. This document reflects the final decision.

## Decision Drivers

MuleSoft (via Salesforce) needs to write data to our API on behalf of specific authenticated CMS users. Currently, two external OAuth clients use the JWT Lambda Authorizer from ADR-026: ARMS (read-only) and MuleSoft (moving to read-write). Our React frontend continues to use Cognito/IDM authentication separately.

When MuleSoft writes data, we need to:

1. **Track actual user's actions** — Record which CMS user performed the action
2. **Apply correct authorization rules** — Role-based permissions must apply
3. **Prevent unauthorized impersonation** — API clients should not be able to impersonate arbitrary users
4. **Maintain performance** — No significant latency increase per request

## Considered Options

### Option 1: Bare User ID in Header (Unrestricted)

Allow any authenticated OAuth client to send a user ID in header (`X-Acting-As-User: user-123`) with no restrictions on which OAuth clients can use this feature.

**Pro:**

- Simplest to implement
- No changes to OAuth client management
- Clear audit trail showing both identities
- No performance impact

**Con:**

- **Security risk**: Any OAuth client could impersonate any user
- No enforcement of which clients are authorized to impersonate
- Any compromised OAuth token = full impersonation capability
- Would not pass security review in isolation

### Option 2: Header-Based Impersonation with API User Type Restrictions

Allow user ID in header, but restrict this capability to a specific API user type (`MULESOFT_API_USER`). Only OAuth clients associated with a `MULESOFT_API_USER` account from IDM can use impersonation headers. Add a database-backed allowlist to control which specific users can be impersonated.

**Implementation approach:**

- Create new `MULESOFT_API_USER` role type in IDM
- Add role allowlist to database
- Context building checks: OAuth user is `MULESOFT_API_USER` → validate against allowlist → replace user context
- Authorization updated: impersonation requests use impersonated user's permissions

**Pro:**

- Clear security boundary — only `MULESOFT_API_USER` role can impersonate
- Policy-based control — explicit allowlist of permitted users
- Full audit trail — `MULESOFT_API_USER` acting as CMS user identity
- Simple for MuleSoft — just add header
- No external dependencies or coordination required
- No performance impact (~15-25ms per request)
- Shorter implementation timeline than Option 3

**Con:**

- We are both issuer and validator — Defeats OAuth's third-party security model. We issue the tokens AND validate them, essentially just trusting ourselves.
- Unbounded user impersonation scope — Any holder of the MuleSoft client credential can impersonate any `CMS_USER` or `CMS_APPROVER_USER` in the system.
- Custom auth implementation — not an industry standard OAuth flow
- Header-based instead of cryptographic token-based impersonation
- Service token has 30-minute expiration
- Allowlist maintenance required
- Not suitable for external third-party integrations
- Requires reimplementation of role-based auth for any new API user requiring write access

### Option 3: RFC 8693 OBO Token with Third-Party IDP (Okta)

Implement full OAuth 2.0 Token Exchange (RFC 8693) using CMS IDM/Okta (`idp.idm.cms.gov`) as the authoritative identity provider. MuleSoft would exchange OIDC tokens for user-scoped tokens via Okta, and our API would validate Okta-issued JWTs containing actor claims.

**Flow:**

1. Salesforce passes the logged-in user's OIDC token to MuleSoft
2. MuleSoft exchanges for user-scoped token from Okta (with `act` claim)
3. Our API validates token against Okta's public key (JWKS)

**Pro:**

- **Standard** — RFC 8693 is the OAuth specification for this use case
- **Real third-party authentication** — Okta is the authority, not self-issued
- **One IDP for all users** — Humans (SAML/OIDC) and machines (OAuth) both use Okta
- Cryptographic proof of impersonation — actor claim in JWT signed by Okta
- Better long-term architecture — aligns with OAuth best practices and no hand rolled auth
- Okta audit logs capture all token issuance
- Can remove custom OAuth server — less code to maintain

**Con:**

- **SAML→OIDC technical blocker** — The Salesforce team's enterprise authentication is SAML-based. The OBO flow would require a SAML assertion → OIDC token conversion, which the CMS IDM team assessed as too complex given their current capacity and the number of applications they manage
- **Requires coordination with CMS IDM team** — Need OAuth client provisioned in Okta and a workflow for SAML → OIDC; IDM team manages this system and no other CMS teams currently use this auth flow.
- **Salesforce complexity** — Would require SAML → OIDC assertion via Okta (RFC 7522)
- **MuleSoft complexity** — Must implement token caching and exchange logic (RFC 8693)

## Decision History

The MC-Review team recommended Option 2 due to the unknown complexity for the Salesforce/Mulesoft team, with an eventual migration to Option 3. Our ISSO asked us to go straight to Option 3, which was approved as the target approach. Over the following months, it became apparent that Option 3 was not feasible:

- The MuleSoft/Salesforce teams had not completed discovery on their implementation requirements. When discovery did occur, the SAML→OIDC bridging required for the token exchange flow was identified as a complication they had not accounted for.
- The CMS IDM team, which manages the enterprise Okta instance (`idp.idm.cms.gov`), assessed the SAML assertion → OIDC token conversion and OBO flow as beyond their current capacity given existing commitments.
- In April 2026, following a cross-team meeting that included CMS stakeholders, Option 3 was assessed as not viable for the IDM and Salesforce teams. The ISSO approved the current approach as an alternative.

## Chosen Solution — Hybrid of Option 1 & 2

The implemented solution uses the header-based impersonation approach of Option 1 (`X-Acting-As-User` header) with the following controls:

1. **Scope-based client restriction** — Only OAuth clients with the `CMS_SUBMISSION_ACTIONS` scope (database-managed) can perform write operations via impersonation
2. **Application-level client restriction** — The `X-Acting-As-User` header is only processed for the designated MuleSoft client credential, enforced via a code-level check (see Pre-Production Requirements)
3. **Impersonated user role restriction** — Only `CMS_USER` and `CMS_APPROVER_USER` roles can be impersonated; all other roles are rejected at the application layer

This approach uses the header mechanism from Option 1 with a subset of the access controls described in Option 2. The full Option 2 implementation (a dedicated `MULESOFT_API_USER` role type from Okta and per-user database allowlist) was not pursued in favor of faster delivery.

### Rationale

1. **Option 3 became non-viable** — SAML→OIDC bridging required for the token exchange flow was not feasible for the IDM team
2. **No external dependencies** — Option 3 required coordination with the CMS IDM team, introducing timeline uncertainty. It also included a need to pass an OIDC token between Salesforce and Mulesoft, which also introduced timeline uncertainty.
3. **ISSO approval** — The ISSO reviewed the security tradeoffs of all three options and approved this approach following the April 2026 cross-team assessment
4. **Scope** — This is an internal CMS-to-CMS integration between known systems; the security posture was assessed as acceptable for this scope by the approving authority
5. **Future migration path** — If compliance requirements change or new integrations require stronger guarantees, migration to Option 3 remains possible; the authorization and user mapping logic would be reusable

### Pre-Production Requirements

The following controls **must be in place before production write access is enabled**.

1. **Application-level client restriction** — A code-level check must ensure `X-Acting-As-User` is only processed when the request comes from the designated MuleSoft client (`MULESOFT_CLIENT_ID` environment variable compared against the OAuth client ID in the request context). Until this is in place, the client restriction is enforced only by database scope assignment, which is insufficient on its own.
2. **Impersonation monitoring and alerting** — Alerts must be active for: any `X-Acting-As-User` header from an unexpected client ID; repeated failed impersonation attempts; unusual impersonation request volume

### Known Limitations and Accepted Risks

The following risks were reviewed and accepted as part of the April 2026 approval:

1. **Unbounded user impersonation scope** — Any holder of the MuleSoft client credential can impersonate any `CMS_USER` or `CMS_APPROVER_USER` in the system. A Salesforce user session provides no cryptographic binding to the API request made on their behalf — the client credential is sufficient to impersonate any eligible user regardless of who is currently active in Salesforce.
2. **Self-issued tokens** — Tokens are issued and validated by the same system (the custom OAuth Lambda established in ADR-026). There is no independent third-party authority like Okta. This was a primary motivation for pursuing Option 3 and is an inherited limitation of ADR-026 that this integration does not resolve.
3. **Client credential compromise = full impersonation capability** — If the MuleSoft client secret is leaked or compromised, the holder gains the ability to impersonate any CMS user in the system until the credential is rotated. This is the primary residual risk. Rotating credentials on a shorter cycle (e.g., daily rather than monthly) would reduce the window during which a compromised credential can be exploited, but would not bring this risk to zero. During any exposure window — however short — the credential holder retains full impersonation capability over all eligible users; rotation frequency reduces duration, not scope. Additionally, credential rotation in this system has no automation: it requires an admin to delete and recreate the OAuth client, then coordinate delivery of the new `client_id` and `client_secret` to the MuleSoft/Index Analytics team for deployment. Daily rotation at that cadence would be a recurring manual cross-team task, and any delay or miscommunication in that handoff would take the integration offline.
4. **No separate impersonation token** — The same 30-minute client credential token is used for both service identity and user impersonation. RFC 8693 would have issued a separate short-lived token scoped to the specific impersonated user for each exchange.
5. **Audit trail is self-generated** — Audit logs are produced by the same system that issues tokens. There is no independent third-party audit record (e.g., Okta token issuance logs). Log integrity depends on the security of the application itself.
6. **Pattern does not scale** — If additional external systems require write access with user impersonation, each would require a new role type, scope assignment, and client restriction. Option 3 would handle new integrations without additional per-integration development.

### When to Reconsider

We should revisit this decision if:

- Additional external integrations require impersonation
- ATO audit or compliance requirements demand third-party token issuance or non-repudiation
- A security review or penetration test identifies exploited or unacceptable risks
- CMS establishes standard enterprise API <> API OAuth patterns we should follow
- The MuleSoft/Salesforce or CMS IDM teams are able to make Option 3 feasible

## Consequences

### Positive Consequences

1. **Unblocks MuleSoft integration** — Delivers write access without external team coordination
2. **No external dependencies** — Fully controlled by our team
3. **Clear audit trail** — Every action logs both API client and impersonated user identity
4. **No performance impact** — All validation is local
5. **Simple for clients** — MuleSoft just adds a header

### Negative Consequences

1. **Not a standard** — Custom implementation, not RFC 8693
2. **Header-based impersonation** — Less robust than cryptographic token exchange; no cryptographic session binding
3. **Self-issued tokens** — Custom OAuth server remains; no independent third-party IDP
4. **No per-user allowlist** — Any `CMS_USER` or `CMS_APPROVER_USER` can be impersonated by the credential holder
5. **Limited scalability** — Pattern does not extend well to additional integrations requiring write access

### Security Comparison

| Aspect | This Implementation | RFC 8693 with Okta |
| --- | --- | --- |
| Token Issuer | Self-issued | Third-party (Okta) |
| Impersonation Proof | Header value | Cryptographic (JWT `act` claim signed by Okta) |
| User Restriction | Role-based (`CMS_USER`/`CMS_APPROVER_USER`) | Okta policies + our database |
| Per-User Allowlist | None | Okta policies + our database |
| Token Lifetime | 30 min (same credential token) | Service: 30 min; Impersonation: 15–60 min (separate) |
| Audit Trail | Our logs | Okta logs + our logs |
| Session Binding | None | Cryptographic (`act` claim bound to user session) |
| Suitable For | Internal integrations (accepted risk) | External + internal |

**Assessment**: This implementation provides a baseline of access control adequate for an internal CMS-to-CMS API integration under the constraints described in the Decision History. It would not be suitable for external third-party integrations or any context requiring non-repudiation. The limitations above were reviewed and accepted amongst the teams involved and the ISSO.

## Monitoring & Alerting

The following must be active before production write access is enabled:

- **Unexpected client using impersonation header** — Alert when `X-Acting-As-User` is received from any client ID other than the designated MuleSoft credential
- **Failed impersonation attempts** — Alert on repeated failures (user not found, unauthorized role, header rejected)
- **Impersonation volume anomaly** — Alert on unusual request volume that may indicate credential misuse

Every impersonated request must log: OAuth client ID, OAuth user ID, impersonated user ID, action, resource, and result.

## References

- [ADR-026: JWT Lambda Authorizer for API Access](./026-jwt-lambda-authorizer-for-api-access.md) — Original OAuth implementation establishing the custom JWT Lambda Authorizer and self-issued token model
- [RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) — Industry standard considered but not implemented due to constraints described above

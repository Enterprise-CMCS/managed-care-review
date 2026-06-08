# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report vulnerabilities through one of these channels:

1. **GitHub Private Vulnerability Reporting (preferred)**
   Use [GitHub's private advisory workflow](https://github.com/Enterprise-CMCS/managed-care-review/security/advisories/new).
   This keeps disclosure coordinated and allows a CVE to be issued through the standard GitHub/NVD pipeline.

2. **CMS Vulnerability Disclosure Policy**
   Reports may also be submitted through the HHS/CMS VDP at
   [https://www.cms.gov/vulnerability-disclosure-policy](https://www.cms.gov/vulnerability-disclosure-policy).

### What to include

- Description of the vulnerability and affected component
- Steps to reproduce or a proof-of-concept (even partial is helpful)
- Potential impact and any suggested mitigations
- Your contact information for follow-up

### Response commitments

| Milestone | Target |
|-----------|--------|
| Acknowledgment | 3 business days |
| Triage and severity assessment | 10 business days |
| Remediation or mitigation plan | Dependent on severity; critical issues prioritized |

We follow responsible disclosure: please allow us to triage and prepare a fix before publishing findings publicly.

---

## Supported Versions

This application is a CMS-operated system. Only the production deployment (`main` branch) is actively maintained and receives security patches. Older feature branches are not supported.

---

## Scope

This policy covers the `managed-care-review` application and infrastructure operated under the **CMS Managed Care Review (MCR)** FISMA system boundary.

**In scope:**
- Authentication and authorization bypass
- Sensitive data exposure (PII, PHI, submission data)
- Injection vulnerabilities (SQL, command, GraphQL)
- Insecure direct object references on submission or rate data
- Misconfigured AWS IAM policies or S3 bucket permissions
- Supply chain vulnerabilities in production dependencies

**Out of scope:**
- Findings on non-production environments (dev, val) that are not reproducible in production
- Rate limiting or brute-force on public, unauthenticated endpoints
- Missing security headers with no demonstrated exploitability
- Social engineering of CMS or contractor staff
- Physical security

---

## Safe Harbor

CMS and the MCR program support responsible security research. Good-faith reporters who follow this policy will not face legal action. We ask that you:

- Give us reasonable time to remediate before public disclosure
- Avoid accessing, modifying, or exfiltrating data beyond what is needed to demonstrate the vulnerability
- Do not disrupt availability of the system

---

## Maintainers

This repository is maintained by the **Enterprise-CMCS** organization. The development team can be reached at mc-review-team@truss.works. For FISMA boundary or compliance escalation, use the CMS VDP link above.

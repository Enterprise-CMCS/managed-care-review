---
title: Monitoring
---

# How to use and validate monitoring tools

## Background
We gather performance data and pay attention to metrics related to our production application. We receive alerts for particular error conditions so that we can investigate errors before they are reported by users. This document explains more about the monitoring tools in use in our application.

## Open Telemetry (OTEL)
Forthcoming.

### Jaeger
See [Jaeger docs](https://www.jaegertracing.io/docs/1.35/getting-started/) or visit port [16686](http://localhost:16686) on local dev.

## New Relic
We export all monitoring and peformance data to New Relic. In order to access our New Relic dashboard, you'll first need to request access from someone on the team. Once access has been granted, the following should be used to sign in to your account:

### Steps to check new relic dashboard
1. Open https://one.newrelic.com and log in to your account using your `@teamtrussworks.com` email address.
2. You will be redirected to the CMS SSO for Active Directory in Azure.
3. Log in with an email address consisting of your EUA ID + `@cloud.cms.gov`.
4. Enter your EUA password at the next screen.
5. You should be prompted to choose your MFA type, either by SMS or by phone.
6. Enter your MFA token. You should now be at our New Relic dashboard where all our OTEL metrics are being displayed.

### Technical details
- New Relic browser monitoring is currently set up in `App.tsx` via inline script. More about this approach in the [instrumentation for browser monitoring](https://docs.newrelic.com/docs/browser/new-relic-browser/page-load-timing-resources/instrumentation-browser-monitoring/).


---
title: Monitoring
---

# How to use and validate monitoring tools

## Background

We gather performance data and pay attention to metrics related to our production application. We receive alerts for particular error conditions so that we can investigate errors before they are reported by users. This document explains more about the monitoring tools in use in our application.

## Open Telemetry (OTEL)

We use [OTEL](https://opentelemetry.io/) for distributed tracing across services in our application. This includes both auto-instrumentation from various OTEL packages, like `@opentelemetry/instrumentation-aws-lambda'`, and manual instrumentation that developers can invoke to record events.

OTEL works around the concept of a trace, which is made up of one or more spans. The spans can come from both the front-end and back-end, and all actions that have been completed that have the same parent trace id will be displayed in New Relic under a single view. For example, if a user save's a submission as draft, a trace will be started on the front end and the backend will receive an HTTP request that include the trace ID in it's http headers. We then extract that trace ID and the invoked Apollo resolver will create a span with that trace ID as it's parent. When the trace is viewed in New Relic you will see the lifecycle of `app-web` connected to `app-api`.

### AWS Distro for OTEL

We use the [AWS Distro for OTEL](https://aws-otel.github.io/docs/introduction) to load a sidecar OTEL collector next to all of our lambdas. This is configured in `app-api` using the `collector.yml`, which is copied into our lambda's environments useing webpack. We can then just send all spans to `localhost`, which then ship them off to New Relic for display.

### OTEL in app-web

Our OTEL setup is stood up in `app-web` from the `TraceContext.tsx` file. We use the `AWSXRayPropagator` to generate and propagate trace IDs in our HTTP headers. We also use the `ZoneContextManager` which is recommended for dealing with async web operations. Since we can't send spans directly to our display system (New Relic) due to CORS issues, we have a small proxy in `app-api` that receives spans from our frontend and sends them off to the local collector to be shipped to New Relic.

### OTEL in app-api

We use the `otel_handler.ts` to create an OTEL tracer in `app-api`. In our Apollo GraphQL handler's `contextForRequestForFetcher` we put the tracer and the extracted parent trace ID that comes down in HTTP headers into our Apollo context, which is then passed to our resolvers. In each resolver we can then use the tracer to create a child span, which then can record either exceptions or success information about the request.

### Jaeger

See [Jaeger docs](https://www.jaegertracing.io/docs/1.35/getting-started/) or visit port [16686](http://localhost:16686) on local dev.

## New Relic

We export all monitoring and peformance data to New Relic. In order to access our New Relic dashboard, you'll first need to request access from someone on the team. Once access has been granted, the following should be used to sign in to your account:

### Setup

-   New Relic browser monitoring is currently set up in `App.tsx` via inline script established in `newRelic.ts`. More about this approach in the [instrumentation for browser monitoring](https://docs.newrelic.com/docs/browser/new-relic-browser/page-load-timing-resources/instrumentation-browser-monitoring/).
-   New Relic is hooked in OTEL data exports via `collector.yml`

### Steps to check new relic dashboard

1. Open https://one.newrelic.com and log in to your account using your `@teamtrussworks.com` email address.
2. You will be redirected to the CMS SSO for Active Directory in Azure.
3. Log in with an email address consisting of your EUA ID + `@cloud.cms.gov`.
4. Enter your EUA password at the next screen.
5. You should be prompted to choose your MFA type, either by SMS or by phone.
6. Enter your MFA token. You should now be at our New Relic dashboard where all our OTEL metrics are being displayed.

### How to test monitoring

-   Login as admin user
-   Navigate to `/settings?test=crash` to test a full frontend crash
-   Navigate to `/settings?test=error` to test logging an error
-   To test backend crash - instructions forthcoming.

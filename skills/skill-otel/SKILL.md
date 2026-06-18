---
name: skill-otel
description: How OpenTelemetry tracing works in the managed-care-review API and how to add to it — resolver spans, dedicated/background spans, recording trace errors, and the Datadog trace-analytics monitors those spans feed. Read when instrumenting code with spans, recording errors on a trace, wiring a Lambda's tracer, or writing/changing a Datadog monitor in infra/datadog.
---

# MC-Review OpenTelemetry tracing skill

Reference for any agent adding or changing distributed tracing in `services/app-api/`, or writing the Datadog monitors that alert on those traces (`infra/datadog/`). The goal is that contract/rate work, background jobs, and submit-path side effects all emit **consistent, queryable spans**, and that the alerts which watch them stay in sync with the code.

## Where tracing lives

- **Provider/setup**: `services/app-api/src/otel/otel_handler.ts` — `initTracer`, `flushTracer`, `recordException`, `recordSpanEvent`.
- **Resolver span helpers**: `services/app-api/src/resolvers/attributeHelper.ts` — `withResolverSpan`, `createResolverSpan`, `setResolverDetails`, `recordResolverError` (+ deprecated helpers, see below).
- **Dedicated zip spans (the template for background/self-contained work)**: `services/app-api/src/zip/zipTracing.ts` — `withZipSpan`, `recordZipFailure`, and the `ZIP_*` constants.
- **Datadog monitors**: `services/app-api/...` spans export to Datadog GovCloud OTLP (`https://otlp.ddog-gov.com/v1/traces`); the monitors that query them are OpenTofu resources in `infra/datadog/monitors.tf` + `variables.tf`.

**Service tag.** Every span's Datadog `service` is taken from the tracer **provider resource** (`service.name = app-api-<stage>`, set in `initTracer`), *not* from the tracer scope name you pass to `trace.getTracer(...)`. So a dedicated span created with its own scope (e.g. `mcreview.zip`) still lands under `service:app-api-<env>` and is caught by the same monitors. Use the scope name only to group instrumentation, never to route service tags.

## When to read this

- Adding a span to any new resolver, store path, background job, or Lambda
- Recording an error so it shows up as a trace error (and deciding fatal-vs-non-fatal)
- Wiring `initTracer`/`flushTracer` into a new handler
- Writing or changing a `datadog_monitor` that targets a span, or adding a stable error marker a monitor will match
- Debugging why a span isn't nesting, isn't exporting, or isn't showing as an error in APM

## Pick the right pattern

| Situation | Use | Why |
|---|---|---|
| Inside a top-level GraphQL Query/Mutation resolver | `withResolverSpan(context, name, attrs, fn)` | Auto-nests Prisma spans, auto-manages span status/lifecycle, links to the frontend trace |
| A self-contained unit of work that can run **either** under a resolver **or** standalone in a batch Lambda (e.g. document zip generation) | A dedicated child span via the `withZipSpan` pattern in `zipTracing.ts` | Consistent span name + attributes regardless of caller; nests under the resolver when present, stands alone in the Lambda |
| A standalone signal you want to count/trend independent of any request's outcome (volume counters, isolated error events) | `recordSpanEvent` / `recordException` from `otel_handler.ts` | They start from `ROOT_CONTEXT`, so the span survives independent of the active request's sampling |
| Marking a **non-fatal** error on an existing span (resolver continues, returns a fallback) | `recordResolverError(span, error)` | Records the exception AND sets ERROR status so it surfaces in status-based dashboards/alerts |
| A **fatal** error in a resolver | Just `throw` | `withResolverSpan` records the exception, sets ERROR status, and ends the span for you |

The core mental model: **one wrapper per "unit of work," errors recorded on the span that owns the work, and a stable marker on anything a monitor needs to find.**

## Pattern 1 — Resolver spans (`withResolverSpan`)

The default for every top-level Query/Mutation resolver. It creates a `resolver.<name>` span as a child of the GraphQL request span, runs your logic inside that span's context (so Prisma `db_query` spans nest under it), and manages status/lifecycle automatically.

```typescript
import { withResolverSpan, setResolverDetails, recordResolverError } from '../attributeHelper'

export function fetchContractResolver(store: Store): QueryResolvers['fetchContract'] {
    return async (_parent, { input }, context) => {
        return withResolverSpan(
            context,
            'fetchContract',
            { 'mcreview.contract_id': input.contractID },
            async (span) => {
                setResolverDetails(span, context.user) // enduser id/role attrs

                const contract = await store.findContractWithHistory(input.contractID)
                if (contract instanceof Error) {
                    // Fatal: just throw — withResolverSpan records + sets ERROR + ends.
                    throw new GraphQLError(/* ... */)
                }
                return { contract }
            }
        )
    }
}
```

Resulting trace shape:

```
frontend: page.view
└── app-web: POST /graphql
    └── app-api: graphql.request
        └── resolver.fetchContract
            ├── prisma:client:operation
            └── prisma:engine:db_query
```

**Non-fatal side effects** (the resolver still succeeds even if this part fails — e.g. zip generation, sending state-analyst emails during submit) use `recordResolverError(span, message)` instead of throwing, so the resolver span is flagged ERROR but the operation still returns:

```typescript
const zipRes = await documentZip.createContractZips(submitContractResult)
if (zipRes instanceof Error) {
    logResolverError('submitContract', errMessage, context)
    recordResolverError(span, errMessage) // marks the resolver span, keeps going
}
```

- `span.end()` is **never** your job inside `withResolverSpan` — the helper owns it. On non-throwing return it intentionally leaves status *Unset* (not OK) so a `recordResolverError` set earlier in the body isn't clobbered back to healthy.
- Don't reach for the active span manually; take the `span` argument the wrapper hands you.

## Pattern 2 — Dedicated spans for self-contained work (`zipTracing.ts` is the template)

Use this when a unit of work has its own failure modes worth tracing on their own span, and it runs from more than one entry point (during a resolver **and** from a background Lambda). Zip generation is the reference implementation; copy its shape for new domains (e.g. a future PDF/export job).

```typescript
// zipTracing.ts — the reusable shape
export async function withZipSpan<T>(attributes: ZipSpanAttributes, fn: (span: Span) => Promise<T>): Promise<T> {
    const tracer = trace.getTracer(ZIP_TRACER_SCOPE)            // scope only; service tag comes from the provider
    const span = tracer.startSpan(ZIP_SPAN_NAME, { attributes: toSpanAttributes(attributes) })
    const spanContext = trace.setSpan(otelContext.active(), span) // nest children (S3, Prisma) under this span
    try {
        const result = await otelContext.with(spanContext, () => fn(span))
        if (result instanceof Error) recordZipFailure(span, result) // error-as-value convention
        else span.setAttribute('zip.outcome', 'success')
        return result
    } catch (error) {
        recordZipFailure(span, parseErrorToError(error))
        throw error
    } finally {
        span.end()
    }
}
```

Key properties to replicate:

- **Stable span name + structured attributes** (`zip.generate` with `zip.type`, `zip.document_type`, `zip.revision_id`, `zip.document_count`, `zip.outcome`). This is what makes "look at all zip traces in one place" possible — filter APM on `operation_name:zip.generate` and the `@zip.*` facets.
- **Handles the codebase's error-as-value convention.** Most store/zip functions *return* an `Error` rather than throwing; the wrapper inspects the return value and records it, and also catches genuine throws.
- **Nests correctly in both contexts.** Because it parents to `otelContext.active()`, it becomes a child of the resolver span during submit/withdraw, and a standalone root-ish span in the `regenerate_zips` Lambda.
- **A stable failure marker for monitoring** (see next section): `recordZipFailure` prefixes the recorded exception message AND the span status message with `ZIP_FAILURE_MARKER` while preserving the original stack/name.

### `withZipSpan` is a per-domain wrapper, not a shared API — and when to change that

`withZipSpan` / `recordZipFailure` are intentionally zip-specific. A second domain (say a PDF export job) would today write its **own** `withPdfSpan` / `recordPdfFailure` / `PDF_*` constants mirroring `zipTracing.ts`. Do **not** try to route a new domain through `withZipSpan` — the zip attribute shape, span name, and marker would be wrong for it.

That said, only the *naming, the typed attributes, and the marker constant* are domain-specific. The control flow is fully generic: start span → run `fn` inside the span's context → inspect the error-as-value return → record the failure → `end`. So follow this trajectory deliberately:

- **One consumer (today, just zip):** keep it as the single domain-specific wrapper. Do not pre-extract a generic helper for a single caller — that's premature abstraction, and the indirection isn't worth it yet.
- **At the second consumer (the PDF case):** that's the trigger to factor the generic control flow out **once** into a shared core — e.g. `withSpan(scope, spanName, attributes, recordFailure, fn)` plus a generic `recordSpanFailure(span, error, marker)` — living in `attributeHelper.ts` or a small `tracing/` util. Then rewrite `withZipSpan` and the new `withPdfSpan` as **thin adapters** (~5 lines each) that only supply their span name, their typed attribute mapper, and their marker constant. The genuinely tricky and easy-to-get-wrong parts — error-as-value handling, `otelContext.active()` nesting, and putting the marker in the exception message (not just status) — must not be copy-pasted into a second place; they belong in the shared core where they can be tested once.
- **Don't widen the abstraction further than its callers need.** Add parameters/options to the shared core only when a real consumer requires them.

In short: copy the pattern for the second domain, but at that same moment hoist the shared mechanics — don't leave two divergent copies of the control flow.

## The stable-marker convention (code ↔ monitor contract)

When a specific failure needs its own Datadog monitor, the span must carry a **stable, unique, human-readable string** the monitor can free-text match. Datadog maps the OTLP **exception event** to the searchable `error.message` tag, so the marker has to live in the recorded exception's message (status message alone is not reliably indexed).

`recordZipFailure` is the canonical implementation:

```typescript
export function recordZipFailure(span: Span, error: Error | string): void {
    const err = error instanceof Error ? error : new Error(error)
    const message = `${ZIP_FAILURE_MARKER}: ${err.message}`
    const markedError = new Error(message)   // marker in the message...
    markedError.name = err.name
    if (err.stack) markedError.stack = err.stack  // ...without losing the original stack
    span.setAttribute('zip.outcome', 'failure')
    span.recordException(markedError)
    span.setStatus({ code: SpanStatusCode.ERROR, message })
}
```

Rules:
- Define the marker as an **exported constant** (`ZIP_FAILURE_MARKER = 'Document zip generation failed'`) and reference it by name in the monitor's `.tf` comment. The string is a contract between the code and `infra/datadog/monitors.tf` — changing it in one place without the other silently breaks the alert.
- Preserve the original `stack`/`name` so the trace stays actionable; only the message gets the prefix.
- Set ERROR status too, so the span shows as an error in status-based views.

## Standalone signal spans (`recordSpanEvent` / `recordException`)

For events you want to count or trend independent of the surrounding request's success (e.g. delegated-user request volume, isolated error markers), use `otel_handler.ts`:

- `recordSpanEvent(serviceName, spanName, attributes)` — emits a single OK span from `ROOT_CONTEXT` so it isn't parented to (or sampled with) the active request. Good for volume/anomaly monitors.
- `recordException(error, serviceName, spanName)` — emits a one-off ERROR span with the exception recorded.

These take `serviceName` as the tracer scope; the Datadog service tag still comes from the provider resource.

## Lambda / handler tracer setup

Any Lambda that should emit spans must initialize and flush the tracer itself. Follow the established handler shape (`apollo_gql.ts`, `audit_s3.ts`, `regenerate_zips.ts`):

1. **`initTracer('app-api-' + stage)` early — before creating the Prisma client.** OTEL registers the Prisma instrumentation during setup, so the client must be created *after* `initTracer` or its db spans won't be captured/nested.
2. **Use `app-api-<stage>` as the service name** if you want the Lambda's spans caught by the existing `service:app-api-<env>` monitors. A different service name (e.g. `audit-s3`) routes spans to a different service and those monitors won't see them.
3. **`flushTracer()` in a guarded `finally`** so queued spans export before the Lambda freezes, and so a flush error never fails the invocation:
   ```typescript
   } finally {
       try { await flushTracer() } catch (flushErr) { console.warn('otel: flush failed', flushErr) }
   }
   ```

**Startup guards (already enforced — rely on them, don't duplicate or mask):** `initTracer` throws if `stage` is unset, and `getDDHeaders` (called inside `initTracer`) throws if `DD_API_KEY` is unset. So both are required at cold start. Don't paper over this with a `process.env.stage ?? 'local'` fallback at the call site — it makes the guard look optional when it isn't. Under unit tests `setupTests.ts` sets `stage='test'`, and `initTracer` short-circuits (no provider, no exporter), so spans become no-ops and tests stay hermetic.

## Datadog monitors for traces

Monitors that watch spans are `datadog_monitor` resources of `type = "trace-analytics alert"` in `infra/datadog/monitors.tf`, with thresholds exposed as `variable`s in `variables.tf`. The provider points at GovCloud (`api.ddog-gov.com`); state lives in S3 (see `main.tf`).

House conventions (match the existing monitors):

- **Query form**: `trace-analytics("service:app-api-${var.environment} status:error \"<stable marker>\"").rollup("count").last("5m") > ${var.<threshold>}`. Free-text match the marker string the code guarantees on the span (see the marker convention). Reference the marker constant by name in a comment.
- **Threshold semantics depend on intent.** An *error-rate* monitor (GraphQL/web errors) uses a non-zero default. A *every-occurrence* monitor — for failures with **no automatic retry**, where one silent failure leaves bad state until someone fixes it (e.g. zip generation today) — uses default `0` so `count > 0` fires on a single occurrence. State the no-retry reality and the manual recovery step in the message.
- **`notify_no_data = false`** for anything where "no data" is the healthy normal state (rare failures, security events). Only error-rate monitors on always-on services set `notify_no_data` from `var.notify_no_data`.
- **Standard fields**: `evaluation_delay = 60`, `renotify_interval = 60`, `include_tags = true`, and the four `tags` (`env:`, `service:`, `managed-by:opentofu`, `team:`).
- **Message**: state the trigger condition, where to look in APM (service + the `@`-facets to filter on), and the concrete operator action. End with `${var.notify_slack}`.
- Run `tofu fmt` before committing `.tf` changes.

## Deprecated — do not use in new code

These remain in `attributeHelper.ts` only for backward compatibility. They have misleading names and/or call `span.end()` as a side effect, which corrupts a shared span (e.g. ending the resolver span early while the rest of the resolver — emails, etc. — is still running):

- `setErrorAttributesOnActiveSpan(message, span)` — ends the span. For non-fatal errors use `recordResolverError(span, error)`; for fatal errors just `throw`.
- `setSuccessAttributesOnActiveSpan(span)` — not needed; `withResolverSpan` manages status/lifecycle.
- `setResolverDetailsOnActiveSpan(name, user, span)` — use `setResolverDetails(span, user)`.

If you find these on a code path you're touching, migrate it to the current helpers as part of the change.

## Key file map

| Concern | Path |
|---|---|
| Tracer provider, init/flush, standalone span helpers | `services/app-api/src/otel/otel_handler.ts` |
| Resolver span helpers (current + deprecated) | `services/app-api/src/resolvers/attributeHelper.ts` |
| Dedicated/background span template (zip) | `services/app-api/src/zip/zipTracing.ts` |
| Zip service using the pattern | `services/app-api/src/zip/generateZip.ts` |
| Submit path consuming the spans (resolver + non-fatal side effects) | `services/app-api/src/resolvers/contract/submitContract.ts` |
| Background Lambda that inits its own tracer | `services/app-api/src/handlers/regenerate_zips.ts` |
| Request entrypoint that inits the tracer | `services/app-api/src/handlers/apollo_gql.ts` |
| Datadog monitors + thresholds | `infra/datadog/monitors.tf`, `infra/datadog/variables.tf` |
| Datadog provider/backend | `infra/datadog/main.tf` |

## Related docs

- `docs/architectural-decision-records/017-use-otel-for-monitoring.md` — the ADR establishing OTEL as the monitoring approach
- `docs/technical-design/monitoring.md` — broader monitoring/observability notes

## How to apply this skill

1. **Classify the work first** (resolver / dedicated unit / standalone signal / marking an existing span) using the "Pick the right pattern" table, then reach for the matching helper.
2. **Prefer the wrapper over manual span management.** Let `withResolverSpan` / a `withZipSpan`-style wrapper own `startSpan`/status/`end`. Manual `span.end()` in business logic is a smell. For a *new* domain of background work, write its own domain wrapper mirroring `zipTracing.ts` — and if it's the **second** such wrapper, extract the shared control flow into one generic core at the same time (see "`withZipSpan` is a per-domain wrapper, not a shared API").
3. **Decide fatal vs non-fatal.** Throw for fatal; `recordResolverError` for non-fatal side effects that still return a result.
4. **If a failure needs an alert, give it a stable exported marker** and put that marker in the recorded exception message (not just status). Wire the monitor to it and name the constant in the `.tf` comment.
5. **For a new Lambda, init the tracer before Prisma, flush in a guarded `finally`, and use `app-api-<stage>`** if you want existing monitors to see it.
6. **Keep code and monitor in lockstep.** Any change to a marker string, span name, or service name may need a matching `infra/datadog` change. Grep `infra/datadog` for the string before changing it.
7. **Never assume this skill is current.** Verify helper names, exports, and file paths against the repo while working — they drift.
8. **Prompt to update.** If you find this skill out of date with the code, tell the human user and offer to update it.

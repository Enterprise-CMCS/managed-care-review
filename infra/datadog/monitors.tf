resource "datadog_monitor" "graphql_errors" {
  name = "[${var.team}] GraphQL API Errors - ${var.environment}"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-api-${var.environment} status:error\").rollup(\"count\").last(\"5m\") > ${var.graphql_error_threshold}"

  message = <<-EOT
    GraphQL API errors detected in **${var.environment}**.

    Triggered when >${var.graphql_error_threshold} errors are recorded in 5 minutes.

    - Check recent deployments
    - Review error details in Datadog APM under service `app-api-${var.environment}`

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.graphql_error_threshold
  }

  notify_no_data    = var.notify_no_data
  no_data_timeframe = var.no_data_timeframe
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-api-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

resource "datadog_monitor" "large_payload_alert" {
  name = "[${var.team}] Large GraphQL Request Payload - ${var.environment}"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-api-${var.environment} status:error \\\"Large request payload detected\\\"\").rollup(\"count\").last(\"5m\") > ${var.large_payload_threshold}"

  message = <<-EOT
    A GraphQL request with an oversized payload was detected in **${var.environment}**.

    Triggered when >${var.large_payload_threshold} "Large request payload detected" error spans (request body over 5.5MB) are recorded by `app-api-${var.environment}` in 5 minutes.

    - Review the trace details in Datadog APM under service `app-api-${var.environment}`
    - Identify which client/query is sending oversized requests

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.large_payload_threshold
  }

  # Unlike the other monitors in this file, this one does not honor
  # var.notify_no_data: large payloads are rare, so "no data" is the normal,
  # healthy state rather than a sign of an outage.
  notify_no_data    = false
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-api-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

resource "datadog_monitor" "impersonation_failed_attempts" {
  name = "[${var.team}] Failed Impersonation Attempts - ${var.environment}"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-api-${var.environment} status:error \\\"delegated\\\"\").rollup(\"count\").last(\"5m\") > ${var.impersonation_failure_threshold}"

  message = <<-EOT
    Repeated failed delegated-user (impersonation) attempts detected in **${var.environment}**.

    Triggered when >${var.impersonation_failure_threshold} failed "delegatedUserAuth" spans (user not found, unauthorized role, or header rejected) are recorded in 5 minutes.

    - Review the `delegatedUserAuth` span details in Datadog APM for **${var.environment}**
    - Identify the OAuth client and acting-as user(s) involved
    - This may indicate a misconfigured client or an attempt at credential misuse

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.impersonation_failure_threshold
  }

  notify_no_data    = false
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-api-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

resource "datadog_monitor" "impersonation_volume_anomaly" {
  name = "[${var.team}] Impersonation Request Volume Anomaly - ${var.environment}"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-api-${var.environment} \\\"delegatedUserRequest\\\"\").rollup(\"count\").last(\"5m\") > ${var.impersonation_volume_threshold}"

  message = <<-EOT
    Unusual volume of delegated-user (impersonation) requests detected in **${var.environment}**.

    Triggered when >${var.impersonation_volume_threshold} "delegatedUserRequest" spans are recorded in 5 minutes, which may indicate credential misuse.

    - Review `delegatedUserRequest` span details in Datadog APM for **${var.environment}**
    - Confirm the volume is expected for legitimate CMS reviewer activity
    - Check which OAuth clients and acting-as users are driving the volume

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.impersonation_volume_threshold
  }

  notify_no_data    = false
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-api-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

resource "datadog_monitor" "zip_generation_failures" {
  name = "[${var.team}] Document Zip Generation Failures - ${var.environment}"
  type = "trace-analytics alert"

  # Matches the dedicated `zip.generate` spans emitted by the app-api zip service
  # (services/app-api/src/zip/zipTracing.ts). Every failed contract or rate zip
  # records an exception prefixed with the stable "Document zip generation failed"
  # marker and sets the span status to error. Keep this phrase in sync with
  # ZIP_FAILURE_MARKER in zipTracing.ts.
  query = "trace-analytics(\"service:app-api-${var.environment} status:error \\\"Document zip generation failed\\\"\").rollup(\"count\").last(\"5m\") > ${var.zip_failure_threshold}"

  message = <<-EOT
    A document zip failed to generate in **${var.environment}**.

    Triggered when >${var.zip_failure_threshold} contract or rate `zip.generate` spans fail (status:error) in 5 minutes. These zips are produced when a contract is submitted/withdrawn and by the batch zip-regeneration Lambda.

    **There is no automatic retry today** — each failure means a submitted contract or rate is sitting without its document zip until someone regenerates it, so treat every alert as actionable:

    - Find the failing `zip.generate` span in Datadog APM under service `app-api-${var.environment}` and note `@zip.type`, `@zip.revision_id`, and `@zip.document_type`
    - Regenerate the missing zip by invoking the `app-api-${var.environment}-cdk-regenerate-zips` Lambda with that revision ID
    - If failures are frequent, capture the underlying error (often S3 download/upload timeouts) to inform the planned worker-queue retry work

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.zip_failure_threshold
  }

  # No failing zips is the normal, healthy state, so absence of data is not an
  # outage signal here (mirrors large_payload_alert / impersonation monitors).
  notify_no_data    = false
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-api-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

resource "datadog_monitor" "web_trace_errors" {
  name = "[${var.team}] Web Application Trace Errors - ${var.environment}"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-web-${var.environment} status:error\").rollup(\"count\").last(\"5m\") > ${var.web_error_threshold}"

  message = <<-EOT
    Trace errors detected in the ${var.team} web app in **${var.environment}**.

    Triggered when >${var.web_error_threshold} errors are recorded in OTEL spans from `app-web-${var.environment}` in 5 minutes.

    - Review error details in Datadog APM under service `app-web-${var.environment}`
    - Review recent frontend deployments

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.web_error_threshold
  }

  notify_no_data    = var.notify_no_data
  no_data_timeframe = var.no_data_timeframe
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-web-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

resource "datadog_monitor" "dashboard_load_time" {
  # Dashboard load-time only matters against real production traffic, so this
  # monitor is created in prod only — the dev/val deploys skip it entirely.
  # (The `page.load` spans themselves are still emitted and viewable in every
  # environment; only the alert is prod-scoped.)
  count = var.environment == "prod" ? 1 : 0

  name = "[${var.team}] Slow CMS Dashboard Page Load - ${var.environment}"
  type = "trace-analytics alert"

  # Rolling average duration of the `page.load` spans emitted by usePageLoadSpan
  # (services/app-web/src/hooks/usePageLoadSpan.ts) on the CMS dashboard tabs,
  # which measure mount -> data-ready. @duration is reported in nanoseconds, so
  # the millisecond threshold is converted with * 1,000,000. Abandoned loads
  # (user navigated away before data arrived, tagged @page.load.abandoned) are
  # excluded so partial timings don't drag the average down.
  query = "trace-analytics(\"service:app-web-${var.environment} @dashboard.tab:(submissions OR rates) -@page.load.abandoned:true\").rollup(\"avg\", \"@duration\").last(\"15m\") > ${var.dashboard_load_threshold_ms * 1000000}"

  message = <<-EOT
    The CMS dashboard is loading slowly in **${var.environment}**.

    Triggered when the 15-minute average `page.load` duration for the Submissions / Rate reviews tabs exceeds ${var.dashboard_load_threshold_ms} ms.

    - Review `page.load` spans in Datadog APM under service `app-web-${var.environment}` (filter on `@dashboard.tab`)
    - Correlate with `@dashboard.row_count` — large result sets are the expected driver and point toward pagination/filtering work
    - Check recent frontend deploys and `app-api-${var.environment}` for slow `indexContracts` / `indexRates` queries

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.dashboard_load_threshold_ms * 1000000
  }

  # A quiet dashboard (no loads in the window, e.g. off-hours) is normal, so
  # absent data is not an outage signal here (mirrors the rare-event monitors).
  notify_no_data    = false
  evaluation_delay  = 60
  renotify_interval = 60
  include_tags      = true

  tags = [
    "env:${var.environment}",
    "service:app-web-${var.environment}",
    "managed-by:opentofu",
    "team:${var.team}",
  ]
}

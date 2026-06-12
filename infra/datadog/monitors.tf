resource "datadog_monitor" "graphql_errors" {
  name = "[${var.environment}] MCR - GraphQL API Errors"
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
    "project:mcr",
  ]
}

resource "datadog_monitor" "large_payload_alert" {
  name = "[${var.environment}] MCR - Large GraphQL Request Payload"
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
    "project:mcr",
  ]
}

resource "datadog_monitor" "web_trace_errors" {
  name = "[${var.environment}] MCR - Web Application Trace Errors"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-web-${var.environment} status:error\").rollup(\"count\").last(\"5m\") > ${var.web_error_threshold}"

  message = <<-EOT
    Trace errors detected in the MCR web app in **${var.environment}**.

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
    "project:mcr",
  ]
}

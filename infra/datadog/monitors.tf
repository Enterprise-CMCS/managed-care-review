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

resource "datadog_monitor" "web_trace_errors" {
  name = "[${var.team}] Web Application Trace Errors - ${var.environment}"
  type = "trace-analytics alert"

  query = "trace-analytics(\"service:app-web-${var.environment} status:error\").rollup(\"count\").last(\"5m\") > ${var.web_error_threshold}"

  message = <<-EOT
    Trace errors detected in the mc-review web app in **${var.environment}**.

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

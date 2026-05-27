resource "datadog_monitor" "graphql_errors" {
  name = "[${var.environment}] MCR - GraphQL API Errors"
  type = "trace-analytics alert"

  query = "traces(\"service:app-api-${var.environment} @error:true\").rollup(\"count\").last(\"5m\") > ${var.graphql_error_threshold}"

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

resource "datadog_monitor" "js_exceptions" {
  name = "[${var.environment}] MCR - Web Application JS Exceptions"
  type = "trace-analytics alert"

  query = "traces(\"service:app-web-${var.environment} @error:true\").rollup(\"count\").last(\"5m\") > ${var.js_error_threshold}"

  message = <<-EOT
    JavaScript exceptions detected in the MCR web app in **${var.environment}**.

    Triggered when >${var.js_error_threshold} exceptions are recorded in 5 minutes.

    - Check browser console errors in Datadog APM under service `app-web-${var.environment}`
    - Review recent frontend deployments

    ${var.notify_slack}
  EOT

  monitor_thresholds {
    critical = var.js_error_threshold
  }

  notify_no_data    = false
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

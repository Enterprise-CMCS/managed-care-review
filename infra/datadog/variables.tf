variable "dd_api_key" {
  type      = string
  sensitive = true
}

variable "dd_app_key" {
  type      = string
  sensitive = true
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, val, prod)"
}

variable "notify_slack" {
  type        = string
  description = "Datadog Slack notification handle, e.g. @slack-managed-care-alerts"
}

variable "graphql_error_threshold" {
  type        = number
  description = "GraphQL errors in 5 minutes before alerting"
  default     = 5
}

variable "js_error_threshold" {
  type        = number
  description = "JS exceptions in 5 minutes before alerting"
  default     = 5
}

variable "notify_no_data" {
  type        = bool
  description = "Alert when a monitor stops receiving data entirely (e.g. service crash with no traces)"
  default     = false
}

variable "no_data_timeframe" {
  type        = number
  description = "Minutes of absent data before a no-data alert fires (only used when notify_no_data = true)"
  default     = 10
}

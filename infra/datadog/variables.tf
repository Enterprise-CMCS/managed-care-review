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

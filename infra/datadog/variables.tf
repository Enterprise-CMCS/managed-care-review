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

variable "team" {
  type        = string
  description = "Team slug used for the [team] name prefix and the team: tag that the shared Datadog dashboard filter keys on."
  default     = "mc-review"
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

variable "web_error_threshold" {
  type        = number
  description = "Trace errors from app-web in 5 minutes before alerting"
  default     = 5
}

variable "dashboard_load_threshold_ms" {
  type        = number
  description = "Alert when the rolling average CMS dashboard page-load span duration (page.load, measuring mount -> data-ready) exceeds this many milliseconds. Observed baseline is a few hundred ms; the default leaves generous headroom — tune down as the metric stabilizes in prod."
  default     = 5000
}

variable "large_payload_threshold" {
  type        = number
  description = "Alert when more than this many \"Large request payload detected\" error spans occur in 5 minutes. Default 0 means any single occurrence triggers the alert."
  default     = 0
}

variable "impersonation_failure_threshold" {
  type        = number
  description = "Alert when more than this many failed delegated-user (impersonation) authorization spans - user not found, unauthorized role, or rejected header - occur in 5 minutes."
  default     = 2
}

variable "impersonation_volume_threshold" {
  type        = number
  description = "Alert when more than this many delegated-user (impersonation) requests occur in 5 minutes, which may indicate credential misuse. Tune based on observed baseline traffic."
  default     = 20
}

variable "zip_failure_threshold" {
  type        = number
  description = "Alert when more than this many document zip generation failures (contract or rate, submit or batch-regeneration path) occur in 5 minutes. There is no automatic retry: a failed zip means a submitted contract/rate is left with no document zip until it is manually regenerated, so the default of 0 alerts on every single failure. Raise it only if a known transient source starts generating noise."
  default     = 0
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

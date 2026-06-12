terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.46"
    }
  }

  backend "s3" {
    # bucket is passed via -backend-config in CI (one bucket per environment account)
    key          = "monitors/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true # OpenTofu native S3 locking — no DynamoDB table needed
  }
}

provider "datadog" {
  api_key = var.dd_api_key
  app_key = var.dd_app_key
  api_url = "https://api.ddog-gov.com"
}

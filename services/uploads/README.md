# Uploads

This service configures file uploads antivirus security scanning to AWS S3.

## Significant dependencies

-   serverless-s3-upload
See usage of `S3Client` in the [`app-web`](../app-web) service.
- https://github.com/CMSgov/lambda-clamav-layer
    - this repo hosts the lambda layer we run clamav out of

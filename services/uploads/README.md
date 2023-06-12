# Uploads

This service deploys s3 buckets for untrusted user uploads, preventing any file from being downloaded from one of those buckets until it has been scanned by ClamAV and found virus free.

Scanning is accomplished by a duo of lambdas: avScan and avDownloadDefinitions.

avScan is triggered directly by an s3 Upload event, it downloads that file from s3, runs clamAV on it, and then sets an s3 tag on the file of 'CLEAN' or 'INFECTED' (or 'ERROR' or 'SKIPPED'). The bucket is configured in serverless.yml to only allow downloading from the bucket if a file has a 'CLEAN' tag, thus ensuring that we never distribute malware uploaded by users.

ClamAV requires an up to date set of "virus definition files" in order to discover the latest known viruses. The binary `freshclam` queries a ClamAV server to get those files when it is run, and since that is being used by all ClamAV users, that query is heavily rate limited. To avoid being rate limited, we cache the results of `freshclam` in a separate s3 bucket and individual runs of avScan pull from that bucket rather than trying to run `freshclam` themselves and surely get rate limited. This is what the avDownloadDefininitions lambda does: it is automatically run every 6 hours, and it runs `freshclam` and updates the av-definitions s3 bucket with the latest virus definitions.

So between those two lambdas we have up to date virus definitions being used to scan every single uploaded file to one of these user uploads buckets.

## avAuditUploads

In addition to live scanning all uploaded files, we also have a pair of lambdas used for auditing the files currently in the bucket.

The avAuditUploads lambda pulls a list of every file in the uploads bucket and then invokes avAuditFiles for each of them in chunks of 20 or so. For any files that are found to be INFECTED, it then grabs the current s3 tags for them and verifies that they are tagged accordingly. If not, it will re-tag the file to be INFECTED, preventing further download.

## Significant dependencies

-   serverless-s3-upload
    -   See usage of `S3Client` in the [`app-web`](../app-web) service.
-   https://github.com/CMSgov/lambda-clamav-layer
    -   this repo hosts the lambda layer we run clamav out of

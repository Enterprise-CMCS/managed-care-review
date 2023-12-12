---
title: Move AV scanning to persistant clamavd
---

## ADR 0025 — Move AV scanning to persistant clamavd

-   Status: Decided
-   Date: 2023-12-05

## Decision Drivers

CMS requires that all files uploaded to S3 go through a virus scanning process. When beginning this project, the MacPro “quickstart” template included a method of virus scanning that relies on S3 bucket events triggering an AWS Lambda. This lambda uses ClamAV’s clamscan tool in a layer, which scans the file and tags it with results. If a file is deemed infected, a policy is added to that file which prevents anyone from downloading it.

This process takes around 30 seconds for a scan to complete, almost all of it (29s) being the time it takes for ClamAV to start up and load virus definitions from disk. To our knowledge, other CMS teams using this system don’t include virus scanning in their application’s UX – if a file is uploaded by a user and is later found to be infected, the user will not know until they go to download the file at a later date and receive an error.

MC-Review found skipping scanning to be suboptimal UX, instead we scan the files as they are uploaded and won’t let a user proceed in the application flow until all files are deemed clean.

Since this takes around 30 seconds to complete, a major pain point has arisen around Cypress tests. Cypress will often flake waiting for a file upload and scan to complete. This causes a lot of issues in CI, as engineers have to re-run the CI suites to get a passing test due to flakes. We also have no good way of knowing when a ClamAV scan is done, so our workaround has been to poll the S3 bucket until we get back a 200 (the assumption being that a file is not available for download until the ‘CLEAN’ tag and associated policy are added allowing downloads).

Additionally, users have had flakes around document upload as well. We’ve decided that we need a better way to do scanning that is faster for our users (and Cypress).,

## Constraints

Include any decisions explicitly out of scope for this ADR.
​

## Considered Options

### Option 1: Cloud Storage Security Tool (CSST – AWS Marketplace)

This is a tool that CMS suggested and is approved in their environments. It deploys (via CloudFormation) a system that has always-on virus scanning instances. It deploys quite a lot of infrastructure:

-   1-2 Services and Tasks (Scanning Agents) to existing region cluster. This is used to run the scanning agents that process the objects.

-   1 ECS Cluster and 1-2 Services and Tasks in each additional region you scan buckets. This is used to run the scanning agents in new regions.

-   SNS Topic, SQS Queue, S3 Bucket events, CloudWatch Log Groups --> Streams. These are used to keep track of the object work.

#### Pros and Cons

-   `+` We don’t have to write it ourselves. Third party is responsible for building it.
-   `+` There’s a virus scanning UI that they provide to view usage/stats.
-   `-` We can’t manage this with our own CI
-   `-` CMS cloud support would have to either run the initial install or give us increased user permissions to create IAM roles and other things required.
-   `-` Lots of infra resources are being created, which seems like overkill and is expensive.

### Option 2: bucketAV (AWS Marketplace)

Similar to the Cloud Storage Security Tool (CSST) above, a SaaS that deploys an always-on virus scanning infrastructure via CloudFormation. Uses less resources than the other tool.

#### Pros and Cons

-   `+` Uses an ec2 instance instead of Docker + Fargate. Overall a smaller install footprint
-   `+` Cheaper than CSST
-   `-` A con of the option

### Option 3: Change UX to async virus scanning

Currently we wait on the virus scanning lambda to mark files CLEAN or INFECTED before letting a user step through the application. The other teams that use this virus scanning setup don’t do this – they let users upload files and don’t worry about the tags on the file. If a file is infected, the user is just not allowed to download that file again and they return an error message.

We discussed changing the UX to accommodate this in DTBM with product & design.

#### Pros and Cons

-   `+` We can continue using the serverless infra that other MACPro teams are using for av scanning
-   `+` No change to CI
-   `+` Would align with how other teams are doing av scanning
-   `+` Better experience for users as they don’t have to wait on scanning at all
-   `-` Would require changes to UX and frontend code
-   `-` Users wouldn’t get alerted immediately when virus scanning errors occur. At best they would get alerted at review & submit and need to be rerouted to earlier stages of the form to re-upload files.

### Option 4: Write a clamavd server ourselves that is always-on

This option would introduce an always on clamavd process in our infrastructure that our lambda could call for scanning. This would largely mean the lambda would stay the same, but instead of calling the clamscan tool that is local to the lambda layer (incurring startup costs), we’d call out to an always on daemon. Two options were considered:

#### A: Connecting over an API

We’d need to put the file on an EFS mount shared between the lambda and the clamavd server. We’d then call a small API that we’d need to write that would take the file path of the file to scan and trigger a scan of the file, sending results back over to the lambda.

#### B: Connecting over a TCP socket

clamdscan can be configured to connect to a clamavd instance either locally or remotely. In this case we would configure a new lambda layer to have the clamdscan tool and the appropriate config files. We’d also be building the ec2 instance that runs and configures clamavd.

The major difference here is that if we can rely on the clamavd server to accept connections over TCP we won’t have to write and maintain a special API to receive scan requests on the ClamAV server.

#### Pros and Cons

-   `+` Less infra than other options – just an ec2 instance.
-   `+` Would not need to change our av scan lambda much
-   `+` We can deploy this with CI
-   `-` We have to write and maintain the ec2 instance
-   `-` We have to maintain the lambda layer
-   `-` We have to write and maintain the API shim (for option a)

## Chosen Solution

Chosen option: Write our own clamavd server that is always on, connecting over a TCP socket.

This seemed to give us the most flexibility while reducing the time users spend in the document upload phase waiting on AV scanning. We won't have to use a third party tool that is outside of our current Serverless deployment pipelines. There should be very little change to our lambda that handles our current scanning while adding a minimal amount of additional infrastructure.

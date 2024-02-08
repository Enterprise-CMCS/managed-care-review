# Uploads

This service deploys s3 buckets for untrusted user uploads, preventing any file from being downloaded from one of those buckets until it has been scanned by ClamAV and found virus free.

Scanning is accomplished by a duo of lambdas: avScan and avDownloadDefinitions.

avScan is triggered directly by an s3 Upload event, it downloads that file from s3, runs clamAV on it, and then sets an s3 tag on the file of 'CLEAN' or 'INFECTED' (or 'ERROR' or 'SKIPPED'). The bucket is configured in serverless.yml to only allow downloading from the bucket if a file has a 'CLEAN' tag, thus ensuring that we never distribute malware uploaded by users.

ClamAV requires an up to date set of "virus definition files" in order to discover the latest known viruses. The binary `freshclam` queries a ClamAV server to get those files when it is run, and since that is being used by all ClamAV users, that query is heavily rate limited. To avoid being rate limited, we cache the results of `freshclam` in a separate s3 bucket and individual runs of avScan pull from that bucket rather than trying to run `freshclam` themselves and surely get rate limited. This is what the avDownloadDefininitions lambda does: it is automatically run every 6 hours, and it runs `freshclam` and updates the av-definitions s3 bucket with the latest virus definitions.

So between those two lambdas we have up to date virus definitions being used to scan every single uploaded file to one of these user uploads buckets.

## avAuditUploads

In addition to live scanning all uploaded files, we also have a pair of lambdas used for auditing the files currently in the bucket.

The avAuditUploads lambda pulls a list of every file in the uploads bucket and then invokes avAuditFiles for each of them in chunks of 20 or so. For any files that are found to be INFECTED, it then grabs the current s3 tags for them and verifies that they are tagged accordingly. If not, it will re-tag the file to be INFECTED, preventing further download.

## ClamAV Daemon

We have an ec2 instance that is created in dev, val, and prod that is configured with an always on ClamAV instance that accepts incoming virus scan requests on port 3310. The motivation here is that we are working towards having our av scanning lambdas use the always on ClamAV daemon rather than rely on just the lambda, as there is a high startup cost for ClamAV of around 29 seconds in our testing. This means that all virus scans take at least 29 seconds for the user. By using an always on instance we can reduce that to closer to the actual time of the virus scan (usually < 1s).

The server is restricted to only have access from connections in the default security group as well as anything else that is placed in the ClamAV security group. This allows for our AV scanning lambds to call out to the instance while restricting all other traffic. However, all of our engineers have ssh pub keys on the instance in case they need access to the machine via ssh for any reason.

### Accessing the VM

Similar to the [Postgres jumpbox](../postgres/README.md), we use the `authorized_keys` file to give access to this VM and you'll need to add your IP to the VM's security group:

1. Determine your public facing IP address. An easy way to do this is to `curl https://ifconfig.me/`
2. Locate the EC2 instance in the AWS console. Click and go into Security > Security groups.
3. There should be two security groups attached to the instance, the default and the ClamAV one. Select the ClamAV security group.
4. On the `Inbound rules` tab select `Edit inbound rules`
5. Add a rule for `ssh` with the `source` set to your local IP address with `/32` appended to it (e.g. `1.2.3.4/32`)
6. Save the rule

#### SSH to the instances

You should now be able to ssh to the jump box.

1. Locate the Public IPv4 address of the instance. This can be found by clicking into the VM on the `Instances` section of the EC2 console.
2. ssh ubuntu@public-ip

You should be using public key auth to ssh. If you need to point to your private key, use `ssh -i ~/.ssh/${yourkeyfile} ubuntu@public-ip`

## Significant dependencies

-   serverless-s3-upload
    -   See usage of `S3Client` in the [`app-web`](../app-web) service.
-   https://github.com/CMSgov/lambda-clamav-layer
    -   this repo hosts the lambda layer we run clamav out of

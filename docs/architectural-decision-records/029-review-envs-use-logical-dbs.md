---
title: Review Environments Use Logical Postgres Databases 
---
## ADR 029 - Review Environments Use Logical Postgres Databases

- Status: Decided
- Date: 4/4/2025

## Decision Drivers
- Minimize infrastructure resources deployed in dev (cost savings)
- Reduce security findings in dev Security Hub

## Overview

The MACPro quickstart had us deploying review environments with completely unique resources in our `dev` AWS account for every git branch pushed to GitHub. This allows every engineer to test code changes in our `dev` account completely isolated from others doing work in `dev`. Overall this has been a successful strategy.

However, originally the architecture called for using DynamoDB as the database for quickstart applications. We ended up moving off of Dynamo for Postgres Aurora a couple years ago as outlined in [ADR 007](./007-move-to-postgres.md). This added additional costs to this architectural setup, as DynamoDB's pricing is different than Postgres in Aurora, particularly around VPC usage. At first this wasn't too high, but when we upgraded to Aurora v2 we ended up needing an aurora cluster and at least one db instance per review environment due to how Aurora v2's architecture works. Additionally, whenever a Security Hub alert would get opened for our DBs in `dev` -- for example, relating to backup retention times -- it'd look like we had significant findings, when in reality it was just a single finding applied to many nearly identical resources. 

## Considered Options

### Option 1

Stay on a unique Aurora deploy per git branch.

### Option 2

Use a single Aurora instance in `dev` and create a logical database per review environment inside that single postgres instance.

## Chosen Solution

We have decided to use logical DBs inside a single `dev` Aurora instance, shared amongst all PRs. We will use a lambda inside the `postgres` service that is responsible for provisioning the postgres database, with the user details continuing to be stored in AWS Secrets Manager. When a branch is merged or deleted, the destroy task will use the lambda with a `delete` event, which will remove the logical DB from the postgres instance and do other associated cleanup tasks.

### Pros and Cons of Alternatives

#### Stay with a unique Aurora deploy per git branch

- `+` No changes to the environment
- `-` Elevated costs in `dev`
- `-` Lots of databases in `dev`, as each Aurora deploy requires a cluster and at least one instance.
- `-` Security Hub alerts for our DB will be amplified by the number of DBs deployed
- `-` Any destroy tasks that fail for any reason could leave around a costly, unused resource

#### Use a logical database provisioned inside a single Aurora `dev` instance.

- `+` Reduced resources and associated costs
- `+` Reduced Security Hub alerts 
- `+` Failed destroy tasks don't risk keeping a costly resource online in our AWS account
- `-` Additional complexity of creating and managing those logical DBs from a lambda 
- `-` If anything happens to the dev db, all review environments are affected

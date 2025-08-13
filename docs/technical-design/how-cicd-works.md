---
title: How the MC-Review CI/CD works
---

# How the MC-Review CI/CD works
We use Github Actions and AWS CDK to deploy between three main environments. These environments are referred to in our github actions workflows as `dev` `val` and `prod`. With our CDK migration, we've standardized the stage naming so that `dev` uses stage `dev`, `val` uses stage `val`, and `prod` uses stage `prod` consistently across all stacks.

Dev is used as the shared developer environment. It also provides infrastructure used for the transient PR review app sandboxes which are built and torn down as pull requests are put up. These review app sandboxes are built on demand when a developer pushes code, and on the initial push, will build a fresh install of MC-Review to a distinct url, with a separate db.

Val is used as the shared staging environment. It is an important place for testing integrations with other teams and applications as well.

Prod is the production environment that serve our users.

There are two main workflow actions: `deploy` and  `promote`. Deploy is used to build all the services that make up MC-Review. It uses AWS CDK to deploy infrastructure stacks in the correct dependency order, then deploys the application code. The CDK deployment process includes:
- `cdk synth` to generate CloudFormation templates
- `cdk deploy` with automatic dependency resolution
- Stack deployment in order: Foundation → Network → Lambda Layers → Data → Auth → Database Operations → API Compute → Frontend → Monitoring

Promote will deploy the application through dev > val > prod in succession, gating for tests and checks at each step.

## Background
We inherited our initial CI and deployments setup from the [Quickstart application](https://github.com/Enterprise-CMCS/macpro-quickstart-serverless), which used Serverless Framework. We have since migrated to AWS CDK for better type safety, infrastructure patterns, and maintainability (see [ADR-031](../architectural-decision-records/031-migrate-from-serverless-to-cdk.md)).

Improvements of note:
- [continuous deployment](../architectural-decision-records/003-deploy-automatically-to-prod.md) moves work dev > val > prod with gates and checks at each step
- [automated testing](../architectural-decision-records/006-automated-testing-approach.md) including robust E2E tests on top of unit and integration testing
- [feature flags](../architectural-decision-records/016-use-launch-darkly-for-feature-flags.md) to allow shipping of partial features
- [github OIDC](../architectural-decision-records/020-use-oidc-for-aws-credentials.md) for short term credential and [targeted github environments](../architectural-decision-records/021-use-github-environments.md), following the work of MAC-FC
- actions to send metrics and AWS security hub alerts to team, also following the work of MAC-FC
## CDK Deployment Details

### Stack Architecture
Our CDK application is organized into multiple stacks with clear dependencies:
- **Foundation Stack**: SSM parameters and shared configuration
- **Network Stack**: VPC and security groups  
- **Lambda Layers Stack**: Shared dependencies (Prisma, OTEL)
- **Data Stack**: RDS Aurora PostgreSQL
- **Auth Stack**: Cognito user pools
- **Database Operations Stack**: Migration and snapshot management
- **API Compute Stack**: Lambda functions and API Gateway
- **Frontend Stack**: S3 and CloudFront
- **Monitoring Stack**: CloudWatch dashboards and alarms

### Deployment Commands
```bash
# Deploy all stacks to dev environment
cd services/infra-cdk
pnpm cdk deploy --all --context stage=dev

# Deploy specific stack
pnpm cdk deploy MCR-ApiCompute-dev-cdk --context stage=dev

# View changes before deployment
pnpm cdk diff --all --context stage=dev
```

### Environment Variables
CDK uses context variables and SSM parameters:
- Stage is passed via `--context stage=<env>`
- Secrets are stored in AWS Secrets Manager
- Configuration values are in SSM Parameter Store
- Environment-specific settings are in `stage-config.ts`

## Breadcrumbs
- Primary github actions workflows can be found in `.github/workflows`
- CDK infrastructure code is in `services/infra-cdk`
- View the [actions panel](https://github.com/Enterprise-CMCS/managed-care-review/actions) in Github and click in to see steps running
- CDK deployment logs show stack progress and CloudFormation events
- Rerunning just the cypress step from the Github panel online doesn't reliably work. Another way to restart the cypress step of our PR deploy workflow is making an empty commit with the commit message `cypress re-run`

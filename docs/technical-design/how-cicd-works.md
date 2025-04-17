---
title: How the MC-Review CI/CD works
---

# How the MC-Review CI/CD works
We use Github Actions and deploy between three environments. These environments are referred to in our github actions workflows as `dev` `val` and `prod`.

Dev is used as the shared developer environment. It also provides infrastructureu sed for the transient PR review app sandboxes which are built and torn down as pull requests are put up. These review app sandboxes get a fresh install of MC-Review to a distinct url, a seperate db, etc witha  `deploy` script and are torn down after PRs merge with the `destroy` script.

Val is used as the shared staging environment. It is an important place for testing integrations with other teams and applications as well.

Prod is the production environment that serve our users.

## Background
We inherited our initial CI and deployments setup from the [Quickstart application](https://github.com/Enterprise-CMCS/macpro-quickstart-serverless), relying heavily on Github Actions and a `deploy` script.  We then added improvments.

Improvements of note:
- [continuous deployment](../architectural-decision-records/003-deploy-automatically-to-prod.md) via a `promote` script that moves work dev > val > prod with gates and checks at each step
- [automated testing](../architectural-decision-records/006-automated-testing-approach.md) including robust E2E tests on top of unit and integration testing
- [feature flags](../architectural-decision-records/016-use-launch-darkly-for-feature-flags.md) to allow shipping of partial features
- [github OIDC](../architectural-decision-records/020-use-oidc-for-aws-credentials.md) for short term credential and [targeted github environments](../architectural-decision-records/021-use-github-environments.md), following the work of MAC-FC


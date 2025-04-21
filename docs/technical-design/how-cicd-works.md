---
title: How the MC-Review CI/CD works
---

# How the MC-Review CI/CD works
We use Github Actions and deploy between three main environments. These environments are referred to in our github actions workflows as `dev` `val` and `prod`. However, a quirk of our Serverless deployment, which we inherited from the quick start, is that the `stage` for our `dev` environment is called `main` while `val` has a stage of `val` and `prod` has a stage of `prod`.

Dev is used as the shared developer environment. It also provides infrastructure used for the transient PR review app sandboxes which are built and torn down as pull requests are put up. These review app sandboxes are built on demand when a developer pushes code, and on the initial push, will build a fresh install of MC-Review to a distinct url, with a separate db.

Val is used as the shared staging environment. It is an important place for testing integrations with other teams and applications as well.

Prod is the production environment that serve our users.

There are two main workflow actions: `deploy` and  `promote`. Deploy is used to build all the services that make up MC-Review. It calls `deploy-app-to-env` and `deploy-infra-to-env` with the environment specific context. Promote will deploy the application through dev> val> prod in success, gating for tests and checks at each step.

## Background
We inherited our initial CI and deployments setup from the [Quickstart application](https://github.com/Enterprise-CMCS/macpro-quickstart-serverless), relying heavily on Github Actions and a `deploy` script.  We then added improvments.

Improvements of note:
- [continuous deployment](../architectural-decision-records/003-deploy-automatically-to-prod.md) moves work dev > val > prod with gates and checks at each step
- [automated testing](../architectural-decision-records/006-automated-testing-approach.md) including robust E2E tests on top of unit and integration testing
- [feature flags](../architectural-decision-records/016-use-launch-darkly-for-feature-flags.md) to allow shipping of partial features
- [github OIDC](../architectural-decision-records/020-use-oidc-for-aws-credentials.md) for short term credential and [targeted github environments](../architectural-decision-records/021-use-github-environments.md), following the work of MAC-FC
- actions to send metrics and AWS security hub alerts to team, also following the work of MAC-FC
## Breadcrumbs
- Primary github actions workflows can be found in `.github/workflows`.
- View the [actions panel](https://github.com/Enterprise-CMCS/managed-care-review/actions) in Github and click in to see steps running
- Rerunning just the cypress step from the Github panel online doesn't reliably work. Another way to restart the cypress step of our PR deploy workflow is making an empty commit with the commit message `cypress re-run`

---
name: skills-cypress
description: Skill for working in the Cypress E2E workspace, including test structure, custom commands, direct API seeding, fixture loading, GraphQL intercepts, and LaunchDarkly flag handling.
---

# MC-Review Cypress skill

Reference for any agent working in the `services/cypress/` portion of the `managed-care-review` codebase.

This skill is for Cypress end-to-end work only. Do not use it for Vitest unit tests.

## When to read these references

Read the relevant reference files when the task involves:
- Adding or modifying Cypress E2E tests
- Adding or changing custom Cypress commands
- Seeding test data through direct API calls instead of UI flows
- Updating LaunchDarkly flag behavior in Cypress
- Debugging why a Cypress spec is waiting on a GraphQL alias or support command
- Understanding where to place a new spec in `services/cypress/integration/`
- Working on OAuth/external API Cypress coverage

If the task only involves Vitest/unit tests or app code outside the E2E harness, you probably do not need these references.

## Reference map — pick by task

| If the task touches… | Read |
|---|---|
| Cypress workspace layout, spec organization, CI/root-run behavior | `references/01-workspace-structure.md` |
| Custom commands, GraphQL aliasing, login waits, navigation waits, support-layer architecture | `references/02-support-and-synchronization.md` |
| Direct GraphQL seeding, fixture document loading, Apollo/auth plumbing, OAuth/external API test helpers | `references/03-direct-api-and-fixtures.md` |
| LaunchDarkly interception, feature-flag store behavior, client/server desync limitations | `references/04-launchdarkly.md` |
| State-form workflow builders, accessibility helpers, URL-sensitive helpers, special-case specs and suite risks | `references/05-workflow-helpers-and-risks.md` |

For broad Cypress tasks, read `01` and `02` first. Pull in `03` for API seeding or OAuth work, `04` for feature-flag changes, and `05` for form helpers, a11y, or suite sharp edges.

## Cheat sheet — facts to keep in mind

- **This skill is for Cypress E2E only.** Do not use it for Vitest unit tests.
- **`support/index.ts` is the Cypress bootstrap.** It registers command modules and extends the `Chainable` type surface.
- **`commands.ts` is the GraphQL alias registry.** Many helpers depend on those aliases for `cy.wait(...)`.
- **`navigateCommands.ts` is synchronization logic, not just navigation.** It encodes expected GraphQL waits, banners, and page test IDs.
- **Many existing Cypress helpers already wait for queries or mutations.** Check the helper implementation before adding manual `cy.wait(...)` calls on top.
- **Direct API seeding is first-class in this workspace.** Use `support/apiCommands.ts` when setup is expensive and not the thing under test.
- **Fixture documents have a special Node-side loading path.** The direct API helpers use `readFixtureDocuments()` rather than only normal Cypress fixtures.
- **LaunchDarkly is stubbed/intercepted on the client side.** Cypress does not automatically keep backend flag behavior in sync.
- **Several helpers are route-shape or DOM-shape sensitive.** URL changes and `react-select` DOM changes can break tests indirectly.
- **Always scan for focused/skipped specs before trusting the suite.** Check for `describe.only`, `it.only`, `describe.skip`, and `it.skip`.

## Key file map

| Concern | Path |
|---|---|
| Cypress config | `services/cypress/cypress.config.ts` |
| Workspace overview | `services/cypress/README.md` |
| Support bootstrap | `services/cypress/support/index.ts` |
| Global test runtime | `services/cypress/support/e2e.ts` |
| GraphQL alias registry | `services/cypress/support/commands.ts` |
| Login helpers | `services/cypress/support/loginCommands.ts` |
| Navigation helpers | `services/cypress/support/navigateCommands.ts` |
| Dashboard link helper | `services/cypress/support/dashboardCommands.ts` |
| State form workflow builders | `services/cypress/support/stateSubmissionFormCommands.ts` |
| Q&A helpers | `services/cypress/support/questionResponseCommands.ts` |
| Settings/admin DOM helpers | `services/cypress/support/userSettingCommands.ts` |
| Accessibility helper | `services/cypress/support/accessibilityCommands.ts` |
| Direct API helpers | `services/cypress/support/apiCommands.ts` |
| LaunchDarkly helpers | `services/cypress/support/launchDarklyCommands.ts` |
| GraphQL alias utils | `services/cypress/utils/graphql-test-utils.ts` |
| Apollo/auth test utilities | `services/cypress/utils/apollo-test-utils.ts` |
| Third-party API example | `services/cypress/integration/thirdPartyAPIAccess/thirdPartyAPIAccess.spec.ts` |
| Virus scan special-case example | `services/cypress/integration/stateWorkflow/virusScan/virusScan.spec.ts` |
| Feature flag design doc | `docs/technical-design/launch-darkly-testing-approach.md` |

## How to apply this skill

1. Start with `references/01-workspace-structure.md` to identify the right workflow area and harness shape.
2. Read `references/02-support-and-synchronization.md` before adding ad hoc waits or new command behavior.
3. Use `references/03-direct-api-and-fixtures.md` when setup is expensive, file-backed, or OAuth-related.
4. Use `references/04-launchdarkly.md` before changing flag-dependent tests.
5. Read `references/05-workflow-helpers-and-risks.md` for state-form helpers, accessibility coverage, and special suite sharp edges.
6. Verify file paths and current command shapes against the repo before depending on this skill.
7. Never assume this skill is up to date. If the code has drifted, prompt the human user on whether they want the skill updated.

# Support And Synchronization

The Cypress support layer is split by concern under `services/cypress/support/`.

## Support file map

| File | Responsibility |
|---|---|
| `commands.ts` | General Cypress utilities and GraphQL alias interception |
| `loginCommands.ts` | Role-based login flows |
| `stateSubmissionFormCommands.ts` | State submission form helpers |
| `submissionReviewCommands.ts` | CMS/admin submission-review helpers |
| `questionResponseCommands.ts` | Q&A workflow helpers |
| `navigateCommands.ts` | Navigation helpers |
| `dashboardCommands.ts` | Dashboard interaction helpers |
| `userSettingCommands.ts` | Settings/admin helpers |
| `apiCommands.ts` | Direct GraphQL/OAuth helper commands |
| `launchDarklyCommands.ts` | LaunchDarkly intercept/state helpers |
| `accessibilityCommands.ts` | `cypress-axe` wrappers |
| `e2e.ts` | global exception handling and shared runtime setup |

The command typings are centralized in `services/cypress/support/index.ts`. If you add a new command, update both:
- the command implementation file
- the `Chainable` declaration in `support/index.ts`

## Check helpers before adding waits

Many existing Cypress helpers already handle waiting for the relevant query or mutation.

Common examples:
- login helpers wait for the expected dashboard or destination queries
- navigation helpers wait for draft-update or fetch queries
- submission-review helpers may wait for the post-action UI state
- dashboard link helpers wait for the appropriate contract fetch

Before adding a manual `cy.wait(...)` in a spec:
1. read the helper implementation being called
2. check whether it already waits for the query or mutation you were about to add
3. only add an extra wait if the helper truly does not cover that transition

Redundant waits are a common source of noisy or brittle tests in this workspace.

## GraphQL alias registry

`cy.interceptGraphQL()` is defined in `services/cypress/support/commands.ts`.

It intercepts `POST */graphql` and aliases common operations by `operationName` using helpers from `services/cypress/utils/graphql-test-utils.ts`:
- `aliasQuery(req, operationName)`
- `aliasMutation(req, operationName)`

This is one of the most important seams in the workspace. Many login and navigation helpers depend on waits such as:
- `@fetchCurrentUserQuery`
- `@indexContractsStrippedQuery`
- `@fetchContractWithQuestionsQuery`
- `@fetchRateWithQuestionsQuery`

If a new page/test needs stable waits, add the operation name here.

### Common failure mode

A missing alias often looks like:
- a command hanging on `cy.wait(...)`
- a login helper timing out
- a navigation helper appearing flaky when the real issue is that the GraphQL operation was never aliased

When debugging Cypress timing in this repo, check `interceptGraphQL()` early.

## Navigation helpers are synchronization helpers

The navigation helpers in `services/cypress/support/navigateCommands.ts` are not just convenience wrappers.

They encode:
- which GraphQL mutation/query should complete after a form action
- which success banner should appear after save-as-draft
- which page-level `data-testid` proves the next form page loaded

Important helpers:
- `navigateContractForm()`
- `navigateContractRatesForm()`
- `navigateFormByDirectLink()`
- `navigateToDashboard()`

Related helper:
- `services/cypress/support/dashboardCommands.ts`
  - `clickSubmissionLink()` decides whether to wait on `fetchContractQuery` or `fetchContractWithQuestionsQuery` based on which submission link is clicked

If the app's route behavior or page test IDs change, these helpers may need updates even if the spec code itself looks fine.

## Login helpers

Login helpers are in `services/cypress/support/loginCommands.ts`.

Role helpers:
- `logInAsStateUser()`
- `logInAsCMSUser()`
- `logInAsAdminUser()`
- `logOut()`

Behavior differs by `AUTH_MODE`:
- `LOCAL`: clicks local fake-auth buttons
- `AWS_COGNITO`: submits credentials through the Cognito login form using `TEST_USERS_PASS`

The helpers also perform route-sensitive waits after login. For example:
- CMS/admin login may visit a passed `initialURL`
- the helper then decides which query to wait on based on whether the URL points at a dashboard, submission summary, rate Q&A page, or settings page

When adding a new destination pattern, update the login helper rather than scattering ad hoc waits in specs.

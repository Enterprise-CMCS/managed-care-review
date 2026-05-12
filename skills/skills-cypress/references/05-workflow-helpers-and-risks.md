# Workflow Helpers And Risks

## State-form workflow builders

The helpers in `services/cypress/support/stateSubmissionFormCommands.ts` are effectively shared business-form fixtures.

They hardcode default:
- submission types
- dates
- document uploads
- program selections
- form-answer assumptions

Treat them as workflow builders tied to current product behavior, not as generic low-level input helpers.

## URL-sensitive helpers

Some helpers branch based on current URL shape rather than explicit inputs.

Example:
- `services/cypress/support/questionResponseCommands.ts`
  - checks whether the URL contains `/rates/`
  - decides whether to wait on contract-question or rate-question mutations and refetches

This is convenient, but route-shape changes can break question/response helpers indirectly.

## React-select and DOM-shape-specific helpers

Some helpers depend on DOM structure rather than stable app-specific test hooks.

Example:
- `services/cypress/support/userSettingCommands.ts`
  - finds the correct `react-select` listbox by matching its generated DOM id pattern

This is a fragile but intentional workaround. If settings tests start failing after a UI refactor, inspect those DOM assumptions first.

## Accessibility helper behavior

Accessibility helpers use `cypress-axe`.

Relevant files:
- `services/cypress/support/accessibilityCommands.ts`
- `services/cypress/README.md`

Pattern:
- call `cy.injectAxe()` after a `cy.visit()`
- call `cy.checkA11yWithWcag22aa()`

If the test triggers another `cy.visit()`, the axe runtime must be injected again.

The accessibility helper is opinionated:
- it logs violation summaries through Cypress tasks
- it restricts checks to the WCAG tags the repo uses
- it disables a few known-problem rules temporarily

If an accessibility result looks surprising, inspect `accessibilityCommands.ts` before assuming default `axe-core` behavior.

## Special-case specs and suite risks

There are a few special-case or high-risk patterns worth watching for:

- `services/cypress/integration/stateWorkflow/virusScan/virusScan.spec.ts`
  - only runs outside `LOCAL` auth mode
  - covers virus scanning behavior that depends on non-local infrastructure
- `services/cypress/integration/thirdPartyAPIAccess/thirdPartyAPIAccess.spec.ts`
  - covers OAuth and delegated external API requests, not browser-only app behavior
- `services/cypress/integration/promoteWorkflow/promote.spec.ts`
  - minimal landing-page coverage, separate from authenticated app workflows

Always scan for accidental focused or skipped tests before trusting the suite. Check for:
- `describe.only`
- `it.only`
- `describe.skip`
- `it.skip`

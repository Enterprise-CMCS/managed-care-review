# LaunchDarkly

LaunchDarkly is handled by request interception plus a test-side JSON store.

Implementation file:
- `services/cypress/support/launchDarklyCommands.ts`

Commands:
- `cy.interceptFeatureFlags(toggleFlags?)`
- `cy.stubFeatureFlags()`
- `cy.getFeatureFlagStore(featureFlags?)`

## How it works

`interceptFeatureFlags()`:
- builds a complete feature-flag object from shared feature flag definitions in `@mc-review/common-code`
- applies any overrides passed by the test
- writes the effective state to `fixtures/stores/featureFlagStore.json`
- intercepts LaunchDarkly client SDK requests and returns those values

`stubFeatureFlags()`:
- intercepts LaunchDarkly event and streaming requests so the app does not keep talking to LD during tests
- then calls `interceptFeatureFlags()` with a few suite-level defaults

`getFeatureFlagStore()`:
- reads `fixtures/stores/featureFlagStore.json`
- returns all flags or only the selected subset

## Important limitation

This setup controls client-side flag values in Cypress, but it does not automatically synchronize server-side LaunchDarkly behavior.

That means a test can end up with:
- client-side flag off via intercept
- server-side flag still on via backend/default behavior

When a test depends on client and server agreeing on a flag, be explicit about that assumption.

## Related design doc

Read this with:
- `docs/technical-design/launch-darkly-testing-approach.md`

That document contains the deeper rationale, the client/server desync limitation, and the reason this workspace uses interception plus a JSON store instead of true LaunchDarkly mutation in test runs.

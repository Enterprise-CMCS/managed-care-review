# 015 — Use Cypress Audit to run pa11y tests

This is an update to [ADR 005 — Define Frontend Toolset for Accessibility Standards](./005-frontend-a11y-toolset.md). When that ADR was written we were still using Nightwatch and not Cypress. Now that we are using Cypress, it makes sense to use [Cypress Audit](https://github.com/mfrachet/cypress-audit) as the tool for running pa11y tests against our app.

This ADR replaces our decision to use pa11y-ci in 005 and instead to use cypress-audit.

## Considered Options

### Use pa11y-ci like we decided before

[pa11y][pa11y] and [pa11y-ci][pa11y-ci] - Accessibility test runner for end to end testing in the command line or Node.js. End to end testing can catch concerns that are not noticeable in linting or unit tests since tests run on browser.

### Use cypress-audit to run pa11y

[Cypress Audit](https://github.com/mfrachet/cypress-audit) is a Cypress plugin that adds a cy.pa11y() command to Cypress. This invokes pa11y on the current page loaded in Cypress. The major advantage here is that it allows us to run these tests in the context of our CI, meaning that logging into the app and adding data to the pages is all done using Cypress and we don't have to repeat that work in the much jankier pa11y tooling.

## Chosen Decision

Use Cypress Audit to run pa11y checks, not pa11y-ci.

### Pro/Cons

### Use pa11y-ci like we decided before

-   `+` pa11y-ci has clear patterns for use in ci
-   `+` Unlike other options explored, includes ‘actions’ to be used within a test to interact with the page under test.
-   `+` Has significant documentation.
-   `-` Could slow development processes if its set too strict. However, many examples of how to optimize configuration as needed in documentation and tutorial

### Use cypress-audit to run pa11y

-   `+` Combines pa11y and Lighthouse. Instead of having separate configs (and separate headless browser runs) for each they are combined. We could easily add Lighthouse tests later down the road.
-   `+` Allows us to login and configure pages using Cypress, which is a much better platform than pa11y's "actions" options. Then we invoke pa11y just to evaluate the accessibility of that page.

[pa11y]: https://github.com/pa11y/pa11y
[pa11y-ci]: https://github.com/pa11y/pa11y-ci

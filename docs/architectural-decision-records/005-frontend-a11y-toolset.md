# OUTDATED Define Frontend Toolset for Accessibility Standards

## This ADR has been superseded by [028-updated-frontend-a11y-toolset](028-updated-frontend-a11y-toolset.md)

Decide on a toolset to help ensure MCRRS frontend development follows accessibility standards (specifically WCAG AA guidelines).

Tooling is not a replacement for engineers/designers with strong expertise in HTML or manual testing with assistive technology. Thus, the toolset will focus on the types of accessibility issues where tooling is useful. This includes validating HTML attributes, checking basic page structure, ensuring media content has descriptive tags, ensuring that buttons are used appropriately, and checking for basic color contrast.

### Considerations

-   Must check React component design for accessibility standards
-   Must validate raw HTML markup for accessibility standards
-   Must include end to end testing for accessibility standards rather than only unit tests
-   Preference for easy options to run in CI

## Chosen Decision

Together these tools include linting, testing, and auditing loaded web pages for accessibility.

[storybook addon-a11y][storybook-addon-a11y] - Provides integration with Storybook GUI which allows the team to surface a11y concerns to non-developer stakeholders. This helps make a11y issues visible beyond the code editor or command line.

[eslint jsx-a11y][eslint-a11y] Provides React-friendly code linting which allows developers to find accessibility issues during local development.

[pa11y][pa11y] and [pa11y-ci][pa11y-ci] - Accessibility test runner for end to end testing in the command line or Node.js. End to end testing can catch concerns that are not noticeable in linting or unit tests since tests run on browser.

[jest-axe][jest-axe] - This tool provides additional jest matchers, like `.toHaveNoViolations`, to use in unit tests. This may be redundant when end to end accessibility testing is present.

### Pro/Cons

#### [@axe-core/react][axe-core-react], [@axe-core/cli][axe-core-cli]

-   `+` This react plugin outputs accessibility warnings in Chrome Devtools when the app is running. The cli plugin surfaces a command for running in CI.
-   `+` Base standard for most accessibility tools. Customizable for different levels of accessibility compliance.
-   `-` Documentation. Couldn’t get it set up quickly, they are in progress of moving their docs and consolidating their npm modules. Minimal documentation and example on best use in CI.
-   `-` Heard from other teams that have struggled customization - when used with standard flags it is more strict than needed.

#### [cypress-audit][cypress-audit]

-   `+` Combines pa11y and Lighthouse. Instead of having separate configs (and separate headless browser runs) for each they are combined.
-   `-` Requires using Cypress (Node engine) for end to end tests. Right now we use Nightwatch. This tool is only relevant if we move towards Cypress.

#### [lighthouse-ci][lighthouse-ci]

-   `+` This web performance and accessibility audit tool is known from Chrome Dev tools. It has a node cli. Uses chromium.
-   `+` Allows the team to get a Lighthouse report alongside every PR.
-   `-` Seemed too robust for this stage of the project (pilot only), provides a lot of information about performance that is not relevant to us now. May be useful later on.

#### [pa11y][pa11y] and [pa11y-ci][pa11y-ci]

-   `+` pa11y-ci has clear patterns for use in ci
-   `+` Unlike other options explored, includes ‘actions’ to be used within a test to interact with the page under test.
-   `+` Has significant documentation.
-   `-` Could slow development processes if its set too strict. However, many examples of how to optimize configuration as needed in documentation and tutorial

#### [eslint-jsx-a11y][eslint-a11y] & [addon-a11y][storybook-addon-a11y]

-   eslint-jsx-a11y and storybook addon-a11y are tried and tested standards we know we will use from experience with other React projects.

[storybook-addon-a11y]: https://storybook.js.org/addons/@storybook/addon-a11y
[eslint-a11y]: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
[pa11y]: https://github.com/pa11y/pa11y
[pa11y-ci]: https://github.com/pa11y/pa11y-ci
[jest-axe]: https://github.com/nickcolley/jest-axe
[axe-core-react]: https://www.npmjs.com/package/@axe-core/react
[axe-core-cli]: https://www.npmjs.com/package/@axe-core/cli
[cypress-audit]: https://github.com/mfrachet/cypress-audit
[lighthouse-ci]: https://github.com/GoogleChrome/lighthouse-ci

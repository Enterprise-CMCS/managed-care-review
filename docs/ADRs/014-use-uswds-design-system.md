# 014 — Use USWDS as design system and @trussworks/react-uswds as component library

Design systems provide shared language and patterns for developing the user interface of an application. Both [USWDS (the United States Web Design System)](https://designsystem.digital.gov/) and the [CMS Design System](https://design.cms.gov/) have been created to fulfill this need for government websites. This is a retroactive ADR to document the thought process for using uswds directly in the application at the beginning of the project, alongside [`@trussworks/react-uswds`](https://github.com/trussworks/react-uswds).

## Decision Drivers

-   Design system is updated regularly and quality documentation exists.
-   Ease of customization - styles must follow other CMS MacPro applications.
-   Availability and robustness of React components - the application is a React app.
-   Availability and robustness of accessibility support - the application must meet WCAG AA.
-   Availability and robustness of Typescript support - the application is Typescript end to end.

## Considered Options

### Use USWDS directly as uswds (selected option)

The USWDS United States Web Design System is the standard for federal government web design. It clearly fulfills requirements of the 21st century IDEA act.

### Use CMS design system `@cmsgov/design-system`

The CMS Design system was built on USWDS v1 and exports slightly different design tokens, classes, and grid specific for the CMS use case.

### Use a combination of systems and libraries (bring in both CMS and USWDS as dependencies)

Here we would mix and match components based on our needs.

## Chosen Decision

Use USWDS directly with @trussworks/react-uswds as a component library. Our team benefits from using a single unified design system that we are familiar with. We can customize USWDS to match widely used CMS styles and colors palettes.

### Pro/Cons

#### Use USWDS directly as uswds (selected option)

-   `+` UWSDS is a well understood standard. USWDS documentation is extensive.
-   `+` USWDS patterns were meant to be adapted in different application contexts. By bringing in USWDS as a direct dependency, developers can use USWDS CSS class names and SCCS utilities directly.
-   `+` No learning curve for onboarding. We use USWDS on several projects.
-   `+` We can then use `@trussworks/react-uswds`, an OSS React component library our team uses regularly and contributes back to. `@trussworks/react-uswds` is written Typescript and exports types we can use as well. It works seamlessly with USWDS classes. It also has compatibility with USWDS mapped to a specific version (whatever version is in the library `package.json`)
-   `-` Compatibility with CMS design paradigm - using a different library with different class names we could have small stylistic differences.
    -   This is mitigated by the fact that the CMS Design System is based on USWDS. The designs and components are already compatible.
    -   This is mitigated by well established customization patterns within USWDS itself - can bring in CMS colors, for example.
-   `-` By using a different component library, `@trussworks/react-uswds`, our codebase could be confusing to other CMS developers.
    -   This is mitigated by USWDS being a widely used standard. `@trussworks/react-uswds` implements React components following USWDS spec for markup. This means `usa-` classnames and HTML that all match the official USWDS.

#### Use CMS design system `@cmsgov/design-system`

-   `+` The design system is built and maintained within CMS. It includes style tokens that match styles used in some other CMS applications. There is a React component library available within `@cmsgov/design-system` as well as built in scripts, stylelint and eslint config. The design library is well documented and actively maintained.
-   `+` The design system can be used without downloading other dependencies.
-   `+` The design system has a clear pattern for creating child design systems specific to an application.
-   `-` CMS design system was started with USWDS V1 but V2 brought in significant changes, including a reshaping in how styles are applied, new components, and a new grid system.
-   `-` Does not have uswds as a versioned and imported dependency so there’s no way to quickly determine what aspects of uswds are supported. The uswds codebase is manually copied into a vendor file.
-   `-` Some interactive React components (Modal and Tabs are the examples we tested out that were in our initial designs in February 2021) did not meet accessibility standards so we could not use them. Other USWDS components were not yet added for React support. We anticipated we would need another library and/or uswds anyway or we would need to build significant custom implementations.

#### Use a combination of systems and libraries (bring in both CMS and USWDS as dependencies)

-   `+` Use whatever components and styles we want without restriction. We could start with CMS Design System but use uswds and other dependencies to cover unsupported use cases from USWDS V2.
-   `+` The CMS uses its own design tokens and prefixes - ds-name-name to avoid conflicts with uswds.
-   `+` This is non-standard. We introduce two kinds of design language - two different design systems with two different patterns for classnames in our application. This makes organizing application styles much more challenging for both designers and engineers.
-   `-` CMS Design system is a standalone library. It is not meant to be used with uswds.
-   `-` Dependency bloat.

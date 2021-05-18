# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

## `yarn storybook`

Run storybook.
Open [http://localhost:6000](http://localhost:6000) to view in the browser.

## `yarn clean`

Clear yarn cache and reinstall.

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**
This command will remove the single build dependency from your project.Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

## React Components

-   We currently use `/components` and `/pages` to organize React components. Use nested folders named after the component.
-   List file imports in ~ alphabetical order, with sections for external imports and assets/styles listed first and local imports below.
-   Follow guidance in the engineering playbook around [implementing UI](https://github.com/trussworks/Engineering-Playbook/blob/main/web/frontend/developing-ui.md)

### Styling

-   Use modular styles. This means creating`<component>.module.scss` or `<component>.module.css` files in your component folders.
-   We tend to use scss rather than css since uswds uses sass mixins, functions, and variables. For more, read about [Sass](https://sass-lang.com/documentation/file.SASS_REFERENCE.html) and [CSS modules](https://github.com/css-modules/css-modules) as well [uswds documentation](https://designsystem.digital.gov/design-tokens/).
-   Syntax: Sass styles should be written in camelCase. Import styles from a component's stylesheet using something like `import styles from 'InvoicePanel.module.scss'`. Access the styles with dot notation `styles.myclassname`. If fewer than 50% of the styles are used from a stylesheet, import only the styles used (ex. `import { myclassname } from 'MyComponent.module.scss'`).
-   If you need to reference sass variables, bring in uswds scss or project/cms scss as `@import '../../styles/uswdsImports.scss';` and `@import '../../styles/custom'` accordingly.

## Testing

### Jest and [testing-library](https://testing-library.com/)

- We write unit and react component integration tests with these tools. For more, learn about `testing-library` [queries](https://testing-library.com/docs/queries/about) and [`waitFor`](https://testing-library.com/docs/dom-testing-library/api-async) as well as [`jest-dom` matchers](https://github.com/testing-library/jest-dom). Understanding these will make it much easier to write React tests.
- If all seems lost try -  `console.log(prettyDOM(firstItem))` - to print the test html with attributes
- Snapshot tests, written with [`react-test-renderer`](https://github.com/facebook/react/tree/master/packages/react-test-renderer) can be useful to guard against small regressions from unintended changes to markup. However, they should be used sparingly, since we have many other great testing tools in place. To override failing snapshot tests with the new markup run `jest --update-snapshots`.

### cypress

We have end to end testing (in the live browser) with [cypress](https://www.cypress.io/). This is configured in the main application `/cypress`, above the level of this service.

### pa11y

`pa11y` is a tool for accessibility testing. `pa11y-ci` is a tool to against the list of urls declared in the config file or a sitemap (if configured). To run locally, you need to global install [pa11y-ci](https://github.com/pa11y/pa11y-ci) `yarn global add pa11y-ci`. For context, By default, pa11y uses the WCAG2AA standard.

If you would like to run pa11y against individual urls or with custom config as part of local development, consider installing plain ol' [pa11y](https://github.com/pa11y/pa11y) `yarn global add pa11y`. This allows you to do things like `pa11y --runner axe --runner htmlcs --standard WCAG2AAA http://localhost:3000`.

To adjust warning levels, ignore certain types of warnings, or create actions (such as button clicks or user login) that happens in test runs reference the [pa11y configuration docs]((https://github.com/pa11y/pa11y#configuration).

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

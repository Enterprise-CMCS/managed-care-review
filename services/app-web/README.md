# app-web 
This is a React application written in Typescript.

## Requirements

- Check that you have `yarn` and `node` installed (`yarn -v` and `node -v` should work).  If not, follow directions from the main app [Requirements](../../README.md).
- Run `yarn` to install all dependencies. 

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

### `yarn build`

Builds the app for production to the `build` folder.\

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## pa11y
`pa11y` is a tool for accessibility testing. `pa11y-ci` is a tool to against the list of urls declared in the config file or a sitemap (if configured). To run locally, you need to global install [pa11y-ci](https://github.com/pa11y/pa11y-ci) `npm install -g pa11y-ci`. For context,  By default, pa11y uses the WCAG2AA standard.

If you would like to run pa11y against individual urls or with custom config as part of local development, consider installing plain ol' [pa11y](https://github.com/pa11y/pa11y)  `npm install -g pa11y`.  This allows you to do things like `pa11y --runner axe --runner htmlcs --standard WCAG2AAA http://localhost:3000`. 

To adjust warning levels, ignore certain types of warnings, or create actions (such as button clicks or user login) that happens in test runs reference the [pa11y configuration docs]((https://github.com/pa11y/pa11y#configuration). 

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

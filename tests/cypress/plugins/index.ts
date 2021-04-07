/// <reference types="cypress" />
// ***********************************************************
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
    const newConfig = config
    newConfig.env.AUTH_MODE = process.env.REACT_APP_AUTH_MODE
    newConfig.env.TEST_USERS_PASS = process.env.TEST_USERS_PASS

    return config
}

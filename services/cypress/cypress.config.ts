const defineConfig = require('cypress')
const { pa11y, prepareAudit } = require('@cypress-audit/pa11y')
const fs = require('fs')
const path = require('path')
const { gql } = require('@apollo/client')

const defineConfig = {
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'support/index.ts',
        fixturesFolder: 'fixtures',
        specPattern: 'integration/**/*.spec.ts',
        screenshotsFolder: 'screenshots',
        videosFolder: 'videos',
        viewportHeight: 1080,
        viewportWidth: 1440,
        setupNodeEvents(on, config) {
            require('@cypress/code-coverage/task')(on, config)
            const newConfig = config
            const authMode = process.env.REACT_APP_AUTH_MODE
            newConfig.env.AUTH_MODE = authMode
            newConfig.env.TEST_USERS_PASS = process.env.TEST_USERS_PASS

            // Configure env for Amplify authorization
            newConfig.env.API_URL = process.env.REACT_APP_API_URL
            newConfig.env.COGNITO_REGION = process.env.COGNITO_REGION
            newConfig.env.USER_POOL_ID = process.env.REACT_USER_POOL_ID
            newConfig.env.IDENTITY_POOL_ID = process.env.REACT_IDENTITY_POOL_ID
            newConfig.env.USER_POOL_WEB_CLIENT_ID = process.env.USER_POOL_WEB_CLIENT_ID

            on('before:browser:launch', (browser, launchOptions) => {
                prepareAudit(launchOptions)
            })

            on('task', {
                pa11y: pa11y(),
                readGraphQLSchema() {
                    // const gqlSchema = loader('./gen/schema.graphql')
                    const gqlSchema = fs.readFileSync(path.resolve(__dirname, './gen/schema.graphql'), 'utf-8')
                    return gql(`${gqlSchema}`)
                }
            })
            return newConfig
        },
    },
    projectId: 'tt5hbz',
    defaultCommandTimeout: 10000,
    retries: {
        runMode: 2,
        openMode: 0,
    },
    chromeWebSecurity: false
}

module.exports = defineConfig

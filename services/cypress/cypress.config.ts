const { defineConfig } = require('cypress')
const { gql } = require('@apollo/client')
const { pa11y, prepareAudit } = require('@cypress-audit/pa11y')
const fs = require('fs')
const path = require('path')
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor')

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'support/index.ts',
        fixturesFolder: 'fixtures',
        specPattern: 'integration/**/*.spec.ts',
        screenshotsFolder: 'screenshots',
        downloadsFolder: 'downloads',
        videosFolder: 'videos',
        viewportHeight: 1080,
        viewportWidth: 1440,
        experimentalRunAllSpecs: true,
        setupNodeEvents(on, config) {
            on('file:preprocessor', createBundler({
                define: {
                    global: 'window'
                }
            }))
            require('@cypress/code-coverage/task')(on, config)
          
            const newConfig = config

            newConfig.env.AUTH_MODE = process.env.REACT_APP_AUTH_MODE
            newConfig.env.TEST_USERS_PASS = process.env.TEST_USERS_PASS

            // Configure env for Amplify authorization
            newConfig.env.API_URL = process.env.REACT_APP_API_URL
            newConfig.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID
            newConfig.env.COGNITO_REGION = process.env.COGNITO_REGION
            newConfig.env.COGNITO_IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID
            newConfig.env.COGNITO_USER_POOL_WEB_CLIENT_ID = process.env.COGNITO_USER_POOL_WEB_CLIENT_ID
            // configure env for third party API access
            newConfig.env.ALLOWED_IP_ADDRESSES = process.env.ALLOWED_IP_ADDRESSES

            on('before:browser:launch', (browser, launchOptions) => {
                prepareAudit(launchOptions)
            })

            // Reads graphql schema and converts it to gql for apollo client.
            on('task', {
                pa11y: pa11y(),
                readGraphQLSchema() {
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
        runMode: 1,
        openMode: 0,
    },
    videoUploadOnPasses: false,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 30
})

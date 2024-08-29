const { defineConfig } = require('cypress')
const { gql } = require('@apollo/client')
const fs = require('fs')
const path = require('path')
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor')

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://127.0.0.1:3000',
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
            on(
                'file:preprocessor',
                createBundler({
                    define: {
                        global: 'window',
                    },
                })
            )
            require('@cypress/code-coverage/task')(on, config)
            on('before:browser:launch', (browser, launchOptions) => {
                launchOptions.args.push('--js-flags=--expose-gc')
                launchOptions.args.push(
                    '--js-flags=--experimental-expose-v8-coverage'
                )
                return launchOptions
            })

            const newConfig = config

            newConfig.env.AUTH_MODE = process.env.VITE_APP_AUTH_MODE
            newConfig.env.TEST_USERS_PASS = process.env.TEST_USERS_PASS

            // Configure env for Amplify authorization
            newConfig.env.API_URL = process.env.VITE_APP_API_URL
            newConfig.env.COGNITO_USER_POOL_ID =
                process.env.COGNITO_USER_POOL_ID
            newConfig.env.COGNITO_REGION = process.env.COGNITO_REGION
            newConfig.env.COGNITO_IDENTITY_POOL_ID =
                process.env.COGNITO_IDENTITY_POOL_ID
            newConfig.env.COGNITO_USER_POOL_WEB_CLIENT_ID =
                process.env.COGNITO_USER_POOL_WEB_CLIENT_ID

            // Reads graphql schema and converts it to gql for apollo client.
            on('task', {
                readGraphQLSchema() {
                    const gqlSchema = fs.readFileSync(
                        path.resolve(__dirname, './gen/schema.graphql'),
                        'utf-8'
                    )
                    return gql(`${gqlSchema}`)
                },
                log(message) {
                    console.log(message)

                    return null
                },
                table(message) {
                    console.table(message)

                    return null
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
    numTestsKeptInMemory: 20,
})

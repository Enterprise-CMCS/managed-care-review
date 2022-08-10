import { defineConfig } from 'cypress'
import { pa11y, prepareAudit, Browser } from '@cypress-audit/pa11y'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'tests/cypress/support/index.ts',
        fixturesFolder: 'tests/cypress/fixtures',
        specPattern: 'tests/cypress/integration/**/*.spec.ts',
        screenshotsFolder: 'tests/cypress/screenshots',
        videosFolder: 'tests/cypress/videos',
        setupNodeEvents(on, config) {
            require('@cypress/code-coverage/task')(on, config)
            const newConfig = config
            newConfig.env.AUTH_MODE = process.env.REACT_APP_AUTH_MODE
            newConfig.env.TEST_USERS_PASS = process.env.TEST_USERS_PASS
            on(
                'before:browser:launch',
                (browser: Browser = {}, launchOptions) => {
                    prepareAudit(launchOptions)
                }
            )

            on('task', {
                pa11y: pa11y(),
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
})

import { defineConfig } from 'cypress'
import task from '@cypress/code-coverage/task'
import { pa11y, prepareAudit, Browser } from '@cypress-audit/pa11y'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'services/cypress/support/index.ts',
        fixturesFolder: 'services/cypress/fixtures',
        specPattern: 'services/cypress/integration/**/*.spec.ts',
        screenshotsFolder: 'services/cypress/screenshots',
        videosFolder: 'services/cypress/videos',
        viewportHeight: 1080,
        viewportWidth: 1440,
        setupNodeEvents(on, config) {
            task(on, config)
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

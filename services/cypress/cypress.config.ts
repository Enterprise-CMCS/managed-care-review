const defineConfig = require('cypress')
const { pa11y, prepareAudit } = require('@cypress-audit/pa11y')

const defineConfig = ({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'services/cypress/support/index.ts',
    fixturesFolder: 'services/cypress/fixtures',
    specPattern: 'services/cypress/integration/**/*.spec.ts',
    screenshotsFolder: 'services/cypress/screenshots',
    videosFolder: 'videos',
    viewportHeight: 1080,
    viewportWidth: 1440,
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config)
      const newConfig = config
      newConfig.env.AUTH_MODE = process.env.REACT_APP_AUTH_MODE
      newConfig.env.TEST_USERS_PASS = process.env.TEST_USERS_PASS
      on(
          'before:browser:launch',
          (browser, launchOptions) => {
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

module.exports = defineConfig

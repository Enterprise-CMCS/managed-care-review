import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
    setupFiles: ['jest-launchdarkly-mock'],

    clearMocks: true,
}

export default config

import { dirname, join } from 'path'
import { createRequire } from 'module'
import type { StorybookConfig } from '@storybook/react-vite'

const require = createRequire(import.meta.url)

function getAbsolutePath(value: string): string {
    return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],

    addons: [
        getAbsolutePath('@storybook/addon-a11y'),
        getAbsolutePath('@storybook/addon-links'),
        getAbsolutePath('@chromatic-com/storybook'),
        getAbsolutePath('@storybook/addon-docs'),
    ],

    typescript: {
        check: false,
        reactDocgen: 'react-docgen-typescript',
        reactDocgenTypescriptOptions: {
            shouldExtractLiteralValuesFromEnum: true,
            compilerOptions: {
                allowSyntheticDefaultImports: false,
                esModuleInterop: false,
            },
        },
    },

    framework: { name: getAbsolutePath('@storybook/react-vite'), options: {} },

    docs: {},

    async viteFinal(config) {
        // Workaround for Rolldown SIGILL bug (rolldown/rolldown#9028) https://github.com/rolldown/rolldown/issues/9028
        // Related storybook issue https://github.com/storybookjs/storybook/issues/34159
        // Storybook sets strictExecutionOrder=true which triggers infinite recursion
        // with circular deps across chunks. Override it after Storybook's plugin runs.
        config.plugins = config.plugins || []
        config.plugins.push({
            name: 'storybook-rolldown-sigill-workaround',
            configResolved(resolvedConfig) {
                if (resolvedConfig.build?.rolldownOptions?.output) {
                    ;(
                        resolvedConfig.build.rolldownOptions.output as any
                    ).strictExecutionOrder = false
                }
            },
        })
        return config
    },
}

export default config

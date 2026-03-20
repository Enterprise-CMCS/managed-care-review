import { dirname, join } from 'path'
import { createRequire } from 'module'
import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import graphqlLoader from 'vite-plugin-graphql-loader'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const configDir = dirname(fileURLToPath(import.meta.url))

function getAbsolutePath(value: string): string {
    return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],

    addons: [
        getAbsolutePath('@storybook/addon-a11y'),
        getAbsolutePath('@storybook/addon-links'),
    ],

    framework: { name: getAbsolutePath('@storybook/react-vite'), options: {} },

    async viteFinal(config) {
        return mergeConfig(config, {
            plugins: [
                svgr({
                    svgrOptions: {
                        exportType: 'named',
                        ref: true,
                        svgo: false,
                        titleProp: true,
                    },
                    include: '**/*.svg',
                }),
                graphqlLoader(),
            ],
            define: {
                global: 'globalThis',
                'process.env': {
                    VITE_APP_AUTH_MODE: JSON.stringify(
                        process.env.VITE_APP_AUTH_MODE
                    ),
                },
            },
            optimizeDeps: {
                include: [
                    'protobufjs/minimal',
                    'buffer',
                    'aws-amplify',
                    '@aws-amplify/api-graphql',
                    '@aws-sdk/querystring-builder',
                    '@aws-sdk/util-utf8-browser',
                    'zen-observable',
                ],
            },
            resolve: {
                alias: {
                    '~uswds': path.resolve(configDir, '../node_modules/uswds'),
                    '@mc-review/common-code': path.resolve(
                        configDir,
                        '../../../packages/common-code'
                    ),
                    '@mc-review/constants': path.resolve(
                        configDir,
                        '../../../packages/constants'
                    ),
                    '@mc-review/helpers': path.resolve(
                        configDir,
                        '../../../packages/helpers'
                    ),
                    '@mc-review/submissions': path.resolve(
                        configDir,
                        '../../../packages/submissions'
                    ),
                    '@mc-review/mocks': path.resolve(
                        configDir,
                        '../../../packages/mocks'
                    ),
                    '@mc-review/otel': path.resolve(
                        configDir,
                        '../../../packages/otel'
                    ),
                    '@mc-review/dates': path.resolve(
                        configDir,
                        '../../../packages/dates'
                    ),
                },
            },
            css: {
                preprocessorOptions: {
                    scss: {
                        api: 'legacy',
                        loadPaths: [
                            path.resolve(
                                configDir,
                                '../node_modules/@uswds/uswds/packages'
                            ),
                        ],
                    },
                },
            },
            build: {
                commonjsOptions: {
                    transformMixedEsModules: true,
                },
            },
        })
    },
}

export default config

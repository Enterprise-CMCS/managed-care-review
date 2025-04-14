import { defineConfig } from 'vitest/config'
import path from 'path'
import {
    generateGraphQLString,
    generateContentsFromGraphqlString,
} from '@luckycatfactory/esbuild-graphql-loader'

export default defineConfig({
    plugins: [
        {
            name: 'graphql-loader',
            async transform(code, id) {
                if (id.endsWith('.graphql') || id.endsWith('.gql')) {
                    const graphqlString = await generateGraphQLString(id)
                    return {
                        code: generateContentsFromGraphqlString(graphqlString),
                        map: null,
                    }
                }
            },
        },
    ],
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            reporter: ['json', 'lcov', 'text'],
            exclude: [
                '**/testHelpers/**',
                '**/index.ts',
                '**/templates.ts',
                '**/emailer.ts',
                '**/postgresStore.ts',
            ],
        },
        alias: {
            uuid: 'uuid',
        },
        testTimeout: 20000,
    },
    define: {
        global: 'globalThis',
        'process.env': {
            VITE_APP_AUTH_MODE: JSON.stringify(process.env.VITE_APP_AUTH_MODE),
        },
    },
    resolve: {
        alias: {
            '~uswds': path.resolve(__dirname, './node_modules/uswds'),
            '@mc-review/common-code': path.resolve(
                __dirname,
                '../../packages/common-code'
            ),
            '@mc-review/constants': path.resolve(
                __dirname,
                '../../packages/constants'
            ),
            '@mc-review/helpers': path.resolve(
                __dirname,
                '../../packages/helpers'
            ),
            '@mc-review/hpp': path.resolve(__dirname, '../../packages/hpp'),
            '@mc-review/mocks': path.resolve(__dirname, '../../packages/mocks'),
            '@mc-review/otel': path.resolve(__dirname, '../../packages/otel'),
            '@mc-review/dates': path.resolve(__dirname, '../../packages/dates'),
            'app-graphql': path.resolve(__dirname, '../app-graphql'),
        },
    },
})

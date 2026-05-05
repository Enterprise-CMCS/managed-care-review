/// <reference types="vitest" />

import { defineConfig } from 'vite'
import 'vitest/config'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import graphqlLoader from 'vite-plugin-graphql-loader'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig(() => ({
    base: '/',
    plugins: [
        react(),
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
        // USWDS v3's CSS references assets at $theme-image-path / $theme-font-path
        // (configured to /uswds/img and /uswds/fonts in src/index.scss).
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/@uswds/uswds/dist/img/**/*',
                    dest: 'uswds/img',
                    // Strip `node_modules/@uswds/uswds/dist/img` (5 segments)
                    // so files land at /uswds/img/<file> and /uswds/img/<subdir>/<file>.
                    rename: { stripBase: 5 },
                },
                {
                    src: 'node_modules/@uswds/uswds/dist/fonts/**/*',
                    dest: 'uswds/fonts',
                    rename: { stripBase: 5 },
                },
            ],
        }),
    ],
    server: {
        open: true,
        port: 3000,
        host: '127.0.0.1',
        cors: {
            origin: '*',
            preflightContinue: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        },
        proxy: {
            '/ld-clientsdk': {
                target: 'http://localhost:3031',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ld-clientsdk/, ''),
            },
            '/ld-clientstream': {
                target: 'http://localhost:3031',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ld-clientstream/, ''),
            },
            '/ld-events': {
                target: 'http://localhost:3031',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ld-events/, ''),
            },
        },
    },
    define: {
        global: 'globalThis',
        'process.env': {
            VITE_APP_AUTH_MODE: JSON.stringify(process.env.VITE_APP_AUTH_MODE),
        },
    },
    build: {
        outDir: './build',
        sourcemap: true,
    },
    resolve: {
        alias: {
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
            '@mc-review/submissions': path.resolve(
                __dirname,
                '../../packages/submissions'
            ),
            '@mc-review/mocks': path.resolve(__dirname, '../../packages/mocks'),
            '@mc-review/otel': path.resolve(__dirname, '../../packages/otel'),
            '@mc-review/dates': path.resolve(__dirname, '../../packages/dates'),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'legacy',
                loadPaths: [
                    path.resolve(
                        __dirname,
                        './node_modules/@uswds/uswds/packages'
                    ),
                ],
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: 'src/setupTests.ts',
        globals: true,
        // Inline-transform react-uswds so vi.mock('focus-trap-react') in test
        // files also intercepts uswds' internal imports (pnpm gives uswds its
        // own resolution path that escapes mocks otherwise).
        server: {
            deps: {
                inline: ['@trussworks/react-uswds'],
            },
        },
        coverage: {
            reporter: ['text', 'json', 'lcov'],
            reportsDirectory: './coverage',
        },
    },
}))

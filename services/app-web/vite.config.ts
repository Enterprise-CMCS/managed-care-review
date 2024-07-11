/// <reference types="vitest" />

import { defineConfig } from 'vite'
import 'vitest/config'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import graphqlLoader from 'vite-plugin-graphql-loader'

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
        nodePolyfills(),
        graphqlLoader(),
    ],
    server: {
        open: true,
        port: 3000,
        host: '127.0.0.1',
    },
    define: {
        global: 'globalThis',
        'process.env': {
            VITE_APP_AUTH_MODE: JSON.stringify(process.env.VITE_APP_AUTH_MODE),
        },
    },
    build: {
        outDir: './build',
    },
    optimizeDeps: {
        include: ['protobufjs/minimal'],
    },
    test: {
        environment: 'jsdom',
        setupFiles: 'src/setupTests.ts',
        globals: true,
        coverage: {
            reporter: ['text', 'json', 'lcov'],
        },
    },
}))

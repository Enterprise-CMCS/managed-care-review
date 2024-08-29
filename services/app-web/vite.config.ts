/// <reference types="vitest" />

import { defineConfig } from 'vite'
import 'vitest/config'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import graphqlLoader from 'vite-plugin-graphql-loader'
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
        nodePolyfills(),
        graphqlLoader(),
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
                target: 'https://clientsdk.launchdarkly.us',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ld-clientsdk/, ''),
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.setHeader('Origin', 'http://localhost:3000')
                    })
                },
            },
            '/ld-clientstream': {
                target: 'https://clientstream.launchdarkly.us',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ld-clientstream/, ''),
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.setHeader('Origin', 'http://localhost:3000')
                    })
                },
            },
            '/ld-events': {
                target: 'https://events.launchdarkly.us',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ld-events/, ''),
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.setHeader('Origin', 'http://localhost:3000')
                    })
                },
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
    optimizeDeps: {
        include: ['protobufjs/minimal'],
    },
    resolve: {
        alias: {
            '~uswds': path.resolve(__dirname, './node_modules/uswds'),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                includePaths: [
                    path.resolve(__dirname, './node_modules/uswds/dist'),
                ],
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: 'src/setupTests.ts',
        globals: true,
        coverage: {
            reporter: ['text', 'json', 'lcov'],
            reportsDirectory: './coverage',
        },
    },
}))

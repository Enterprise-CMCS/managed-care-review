import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import graphqlLoader from 'vite-plugin-graphql-loader'

export default defineConfig({
    // depending on your application, base can also be "/"
    base: '/',
    plugins: [
        react(),
        svgr({
            svgrOptions: {
                exportType: 'named', // Use 'named' if you prefer named exports
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
        // this ensures that the browser opens upon server start
        open: true,
        // this sets a default port to 3000
        port: 3000,
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
})

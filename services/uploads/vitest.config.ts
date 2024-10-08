import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 60000, // Most of these test run clamscan which takes a while
        setupFiles: [
            fileURLToPath(
                new URL('./src/vitestGlobalSetup.ts', import.meta.url)
            ),
        ],
        exclude: ['**/local_buckets/**'],
    },
    resolve: {
        alias: {
            uuid: 'uuid',
        },
    },
})

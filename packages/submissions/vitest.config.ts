import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        exclude: ['**/build/**', '**/node_modules/**'],
        coverage: {
            reporter: ['json', 'lcov', 'text'],
            exclude: ['**/index.ts', '**/build/**'],
        },
    },
})

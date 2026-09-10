import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        // Scripts compile in place, so prefer source when both files exist.
        extensions: ['.ts', '.mts', '.js', '.mjs', '.json'],
    },
    test: {
        globals: true,
        environment: 'node',
        reporters: ['default'],
        // Unlike the packages, scripts compiles in place rather than into
        // build/, so the emitted .js sits beside its source. Discover only the
        // TypeScript tests or every case would run twice.
        include: ['**/*.test.ts'],
        exclude: ['**/build/**', '**/node_modules/**'],
        coverage: {
            reporter: ['json', 'lcov', 'text'],
            exclude: ['**/index.ts', '**/build/**', '**/*.js'],
        },
    },
})

import tseslint from 'typescript-eslint'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import jest from 'eslint-plugin-jest'

export default tseslint.config([
    {
        ignores: ['cdk.out/*', 'node_modules/*'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                project: './tsconfig.json',
                sourceType: 'module',
            },
            globals: {
                // Node.js globals
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                console: 'readonly',
                global: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            jest: jest,
        },
        rules: {
            // Base JS rules
            'array-callback-return': 'error',
            'prefer-promise-reject-errors': 'error',
            'no-throw-literal': 'error',
            'no-unused-vars': 'off',

            // TypeScript rules
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_*' },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',

            // Jest rules
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',

            // Console rules
            'no-console': [
                'warn',
                {
                    allow: [
                        'assert',
                        'clear',
                        'count',
                        'countReset',
                        'debug',
                        'dir',
                        'dirxml',
                        'error',
                        'group',
                        'groupCollapsed',
                        'groupEnd',
                        'info',
                        'profile',
                        'profileEnd',
                        'table',
                        'time',
                        'timeEnd',
                        'timeLog',
                        'timeStamp',
                        'trace',
                        'warn',
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        languageOptions: {
            globals: {
                // Test globals
                jest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                vi: 'readonly',
                vitest: 'readonly',
            },
        },
    },
])

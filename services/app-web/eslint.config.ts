import tseslint from 'typescript-eslint'
import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import jest from 'eslint-plugin-jest'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config([
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        ignores: [
            'src/gen/*',
            '*.config.ts',
            '*.config.js',
            '*.config.mjs',
            'esbuild.config.js',
        ],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                project: ['./tsconfig.json'],
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                URLSearchParams: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                global: 'readonly',

                // React globals
                React: 'readonly',
                JSX: 'readonly',

                // TypeScript globals
                RowData: 'readonly',
                FilterFn: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            'jsx-a11y': jsxA11y,
            jest: jest,
            'react-hooks': reactHooks,
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
                {
                    argsIgnorePattern: '^_*',
                    destructuredArrayIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true,
                },
            ],
            '@typescript-eslint/no-floating-promises': 'error',

            // Jest rules
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',

            // React Hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

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
        files: [
            '**/*.test.{js,jsx,ts,tsx}',
            '**/*.spec.{js,jsx,ts,tsx}',
            '**/setupTests.ts',
        ],
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
    {
        files: ['src/**/*.stories.tsx'],
        rules: {
            'import/no-anonymous-default-export': 'off',
        },
    },
])

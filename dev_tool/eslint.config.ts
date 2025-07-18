import tseslint from 'typescript-eslint'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

export default tseslint.config([
    {
        files: ['**/*.ts'],
        ignores: ['*.config.js', '**/esbuild.config.js'],
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
        },
        rules: {
            // Base JS rules
            'prefer-promise-reject-errors': 'error',
            'no-throw-literal': 'error',
            'no-unused-vars': 'off',

            // TypeScript rules
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_*' },
            ],

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
])

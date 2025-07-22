import tseslint from 'typescript-eslint'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

export default tseslint.config([
    {
        files: ['**/*.ts'],
        ignores: [
            'dist/*',
            '*.config.js',
            '*.config.mjs',
            '*.config.ts',
            '**/esbuild.config.js',
        ],
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
            // TypeScript recommended rules will be applied via the plugin
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_*' },
            ],
        },
    },
])

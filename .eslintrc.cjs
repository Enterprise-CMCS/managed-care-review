module.exports = {
    root: true,
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:jest/recommended',
        'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.eslint.json', './services/*/tsconfig.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    rules: {
        'prefer-promise-reject-errors': 'error',
        'no-throw-literal': 'error',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
    },
    settings: {
        jest: {
            version: '26',
        },
    },
}

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
        'plugin:jest/recommended',
        'prettier',
        'prettier/@typescript-eslint',
    ],
    ignorePatterns: ['gen/*'],
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
};

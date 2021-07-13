module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    plugins: ['jsx-a11y', 'testing-library'],
    extends: [
        'eslint:recommended',
        'plugin:jest/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:testing-library/recommended',
        'prettier',
        'prettier/react',
        'prettier/@typescript-eslint',
        'react-app',
        'react-app/jest',
    ],
    ignorePatterns: ['src/gen/*'],
    rules: {
        'prefer-promise-reject-errors': 'error',
        'no-throw-literal': 'error',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
    },
    overrides: [
        {
            files: ['src/**/*.stories.tsx'],
            rules: {
                'import/no-anonymous-default-export': 'off',
            },
        },
    ],
    settings: {
        jest: {
            version: '26',
        },
    },
};

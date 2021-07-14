module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
    },
    plugins: ['jsx-a11y', 'testing-library'],
    extends: [
        'plugin:jsx-a11y/recommended',
        'plugin:testing-library/recommended',
        'prettier/react',
        'react-app',
        'react-app/jest',
    ],
    ignorePatterns: ['src/gen/*', '.eslintrc.js'],
    overrides: [
        {
            files: ['src/**/*.stories.tsx'],
            rules: {
                'import/no-anonymous-default-export': 'off',
            },
        },
    ],
};

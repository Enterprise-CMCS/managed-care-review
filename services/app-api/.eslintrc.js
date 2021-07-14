module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
    },
    ignorePatterns: ['gen/*', '.eslintrc.js'],
};

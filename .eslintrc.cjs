module.exports = {
    root: true,
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.eslint.json', './services/*/tsconfig.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
}

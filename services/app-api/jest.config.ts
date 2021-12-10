module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '\\.graphql$': 'jest-raw-loader',
    },
    coverageReporters: [['lcov', { projectRoot: '../../' }], 'text'],
    moduleFileExtensions: ['js', 'json', 'jsx', 'd.ts', 'ts', 'tsx', 'node'],
    coveragePathIgnorePatterns: [
        'testHelpers',
        'index.ts',
        'templates.ts',
        'emailer.ts',
        'postgresStore.ts',
    ],
}

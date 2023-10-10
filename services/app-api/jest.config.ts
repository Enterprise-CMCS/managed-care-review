module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '\\.(gql|graphql)$': '@graphql-tools/jest-transform',
    },
    coverageReporters: [
        [
            'json',
            {
                projectRoot: '../../',
            },
        ],
        [
            'lcov',
            {
                projectRoot: '../../',
            },
        ],
        'text',
    ],
    moduleFileExtensions: ['js', 'json', 'jsx', 'd.ts', 'ts', 'tsx', 'node'],
    coveragePathIgnorePatterns: [
        'testHelpers',
        'index.ts',
        'templates.ts',
        'emailer.ts',
        'postgresStore.ts',
    ],
    moduleNameMapper: {
        '^uuid$': require.resolve('uuid'),
    }
}

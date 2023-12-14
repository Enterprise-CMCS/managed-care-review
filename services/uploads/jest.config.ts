module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testTimeout: 60000, // Most of these test run clamscan which takes a while
    globalSetup: '<rootDir>/src/jestGlobalSetup.ts',
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
    moduleFileExtensions: ['js', 'json', 'jsx', 'd.ts', 'ts', 'node'],
    coveragePathIgnorePatterns: [],
    modulePathIgnorePatterns: ['local_buckets'],
    moduleNameMapper: {
        '^uuid$': require.resolve('uuid'),
    },
}

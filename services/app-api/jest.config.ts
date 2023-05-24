import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '\\.graphql$': 'jest-raw-loader',
    },
    coverageReporters: [
        [
            'lcov',
            {
                projectRoot: '../../',
            },
        ],
        'text',
    ],
    moduleFileExtensions: ['js', 'json', 'jsx', 'd.ts', 'ts', 'tsx', 'node'],
    moduleNameMapper: {
        '^@managed-care-review/common-code/(.*)$':
            '<rootDir>/lib/common-code/src/$1',
    },
    coveragePathIgnorePatterns: [
        'testHelpers',
        'index.ts',
        'templates.ts',
        'emailer.ts',
        'postgresStore.ts',
    ],
}

export default jestConfig

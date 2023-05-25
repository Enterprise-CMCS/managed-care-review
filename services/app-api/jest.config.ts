import type { JestConfigWithTsJest } from 'ts-jest'
import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from '../../tsconfig.json'

const jestConfig: JestConfigWithTsJest = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '\\.graphql$': '@glen/jest-raw-loader',
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
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/../../',
    }),
    coveragePathIgnorePatterns: [
        'testHelpers',
        'index.ts',
        'templates.ts',
        'emailer.ts',
        'postgresStore.ts',
    ],
}

export default jestConfig

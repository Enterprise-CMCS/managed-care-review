/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from '../../tsconfig.json'

export default {
    setupFiles: ['jest-launchdarkly-mock'],
    preset: 'ts-jest',
    modulePathIgnorePatterns: ['dist'],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/../../',
    }),
}

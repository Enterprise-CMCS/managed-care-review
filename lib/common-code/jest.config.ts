/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
    setupFiles: ['jest-launchdarkly-mock'],
    preset: 'ts-jest',
    modulePathIgnorePatterns: ['dist'],
}

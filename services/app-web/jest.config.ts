const jestConfig = {
    setupFiles: ['jest-launchdarkly-mock'],
    moduleNameMapper: {
        '^@managed-care-review/common-code/(.*)$':
            '<rootDir>/lib/common-code/src/$1',
    },
}

export default jestConfig

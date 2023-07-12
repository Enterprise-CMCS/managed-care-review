const jestConfig = {
    setupFiles: ['jest-launchdarkly-mock'],
    moduleNameMapper: {
        '^@managed-care-review/common-code/(.*)$':
            '<rootDir>/lib/common-code/src/$1',

        '^@managed-care-review/app-graphql/(.*)$':
            '<rootDir>/services/app-graphql/src/$1',
    },
}

export default jestConfig

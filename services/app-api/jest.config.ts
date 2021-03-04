module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		'\\.graphql$': 'jest-raw-loader',
	},
}

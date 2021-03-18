module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		'\\.graphql$': 'jest-raw-loader',
	},
	moduleFileExtensions: ['js', 'json', 'jsx', 'd.ts', 'ts','tsx', 'node'],
}

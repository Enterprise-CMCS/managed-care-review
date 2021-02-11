import * as fs from 'fs'

// envFileMissingExamples returns any keys that are prseent in .env_example but missing from .env
export function envFileMissingExamples(): string[] {

	const actual = fs.readFileSync('.env', 'utf8')
	const example = fs.readFileSync('.env_example', 'utf8')

	// get all keys from the file. Split each line on '='
	function envKeys(env: string): string[] {
		const lines = env.split('\n')
		return lines.filter( (line) => line.includes('=') ).map( (line) => {
			const parts = line.split('=')
			return parts[0]
		})
	}

	const actualKeys = envKeys(actual)
	const exampleKeys = envKeys(example)

	const missingKeys: string[] = []

	exampleKeys.forEach( (exampleKey) => {
		if (!(actualKeys.includes(exampleKey))) {
			missingKeys.push(exampleKey)
		}
	})

	return missingKeys
}
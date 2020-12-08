import { spawn, spawnSync } from 'child_process'
import { readFileSync, existsSync, copyFileSync } from 'fs'
import yargs from 'yargs'
import { config as dotenvconf } from 'dotenv'

// load .env
dotenvconf()

// ensure_dev_deps checks that node is at the right version and yarn is installed. None of the other jobs will work without them.
async function ensure_dev_deps(runner: LabeledProcessRunner) {
	const node_version = spawnSync('node', ['-v'])
	let active_node_version = ''
	if (node_version.error) {
		// Assume node is not installed, but there are probably other ways this command could fail.
		active_node_version = 'UNINSTALLED'
	} else if (node_version.status !== 0) {
		throw new Error(`unexpected error getting node version:\n${node_version.stdout}\n${node_version.stderr}`)
	} else {
		active_node_version = node_version.stdout.toString().trim()
	}

	// .nvmrc is how nvm tracks the expected version for a project
	const expected_node_version = readFileSync('./.nvmrc').toString().trim()

	if (expected_node_version !== active_node_version) {
		console.log(`\n\tUh Oh! The current node version: ${active_node_version} does not match the required version: ${expected_node_version}` );
		console.log(`\tIf you have installed nvm, simply running 'nvm use' in this directory should solve the problem`);
		console.log(`\tIf you don't have nvm yet, the instructions here should get you started. https://github.com/nvm-sh/nvm#installing-and-updating`);
		console.log(`\t** Don't forget to add the bit to your shell profile **\n`);

		throw new Error('node version mismatch');
	}

	const yarn_version = spawnSync('yarn', ['-v'])
	if (yarn_version.error) {
		console.log(`\n\tOh dear. You don't have yarn installed. That's a requirement I'm afraid, but it's easy to fix.` );
		console.log(`\tOn macOS, a simple 'brew install yarn' should do the trick.\n`);

		throw new Error('yarn not installed');
	} else if (yarn_version.status !== 0) {
		throw new Error(`unexpected error getting yarn version:\n${yarn_version.stdout}\n${yarn_version.stderr}`)
	}
	// Ignoring yarn version for now. If we wanted to standardize here would be a place to do it.

	// if .env doesn't exist, copy .env_example into place and rerun dotenv
	if (!existsSync('./.env')) {
		console.log('\tConfiguring dev environment by copying over .env_example to .env\n\n')
		copyFileSync('./.env_example', './.env')
		dotenvconf()
	}

}


// run_db_locally runs the local db
async function run_db_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('dynamo yarn', ['yarn', 'install'], 'services/database')
	await runner.run_command_and_output('dynamo deps', ['serverless', 'dynamodb', 'install'], 'services/database')
	runner.run_command_and_output('dynamodb', ['serverless', '--stage', 'main', 'dynamodb', 'start', '--migrate'], 'services/database')

}

// run_api_locally uses the serverless-offline plugin to run the api lambdas locally
async function run_api_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('server yarn', ['yarn', 'install'], 'services/app-api')
	runner.run_command_and_output('serverless', ['serverless', '--stage', 'main', '--region', 'us-east-1', 'offline', '--httpPort', '3030', 'start'], 'services/app-api')
	
}

// run_fe_locally runs the frontend and its dependencies locally
async function run_fe_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('fe deps', ['yarn', 'install'], 'services/ui-src')
	await runner.run_command_and_output('local conf', ['./env.sh', 'main'], 'services/ui-src')

	runner.run_command_and_output('s3', ['serverless', '--stage', 'main', 's3', 'start'], 'services/ui')
	runner.run_command_and_output('frontend', ['npm', 'start'], 'services/ui-src')
	
}

class LabeledProcessRunner {
	private prefixColors: Record<string, string> = {}
	private colors = ['1', '2', '3', '4', '5', '6', '9', '10', '11', '12', '13', '14']

	private formattedPrefix(prefix: string): string {
		let color: string

		if (prefix !in this.prefixColors) {
			color = this.prefixColors[prefix]
		} else {
			const frontColor = this.colors.shift()
			if (frontColor != undefined) {
				color = frontColor
				this.colors.push(color)
				this.prefixColors[prefix] = color
			} else {
				console.log("BAD NEWS BEARS")
				throw('dev.ts programming error')
			}
		}

		let maxLength = 0
		for (let pre in this.prefixColors) {
			if (pre.length > maxLength) {
				maxLength = pre.length
			}
		}

		return `\x1b[38;5;${color}m|${prefix.padStart(maxLength)}|\x1b[0m`
	}

	async run_command_and_output(prefix: string, cmd: string[], cwd: string | null) {

		const proc_opts: Record<string, any> = {}

		if (cwd) {
			proc_opts['cwd'] = cwd
		}

		// proc_opts['env'] = Object.assign({}, process.env)

		const command = cmd[0]
		const args = cmd.slice(1)

		const proc = spawn(command, args, proc_opts)
		const startingPrefix = this.formattedPrefix(prefix)
		process.stdout.write(`${startingPrefix} Started\n`);

		proc.stdout.on('data', data => {
			const paddedPrefix = this.formattedPrefix(prefix)

			for (let line of data.toString().split('\n')) {
				process.stdout.write(`${paddedPrefix} ${line}\n`);
			}
		});

		proc.stderr.on('data', data => {
			const paddedPrefix = this.formattedPrefix(prefix)

			for (let line of data.toString().split('\n')) {
				process.stdout.write(`${paddedPrefix} ${line}\n`);
			}
		});

		return new Promise<void>((resolve, reject) => {
			const paddedPrefix = this.formattedPrefix(prefix)
			proc.on('error', (error) => {
				const paddedPrefix = this.formattedPrefix(prefix)
				process.stdout.write(`${paddedPrefix} AN ERROR: ${error}\n`)
				reject(error)
			})

			proc.on('close', code => {
				const paddedPrefix = this.formattedPrefix(prefix)
				process.stdout.write(`${paddedPrefix} Exiting: ${code}\n`);
				resolve()
			})
		})
	}

}

// run_all_locally runs all of our services locally
async function run_all_locally(onlyDeps: boolean) {
	const runner = new LabeledProcessRunner()

	try {
		await ensure_dev_deps(runner)

		if (!onlyDeps) {	
			run_db_locally(runner)
			run_api_locally(runner)
			run_fe_locally(runner)
		}

	} catch (error) {
		console.log("Error attempting to run locally: ", error)
	}
}

// The command definitons in yargs
// All valid arguments to dev should be enumerated here, this is the entrypoint to the script
const argv = yargs(process.argv.slice(2))
	.command('local', 'run system locally', {
		'only-deps': {
			type: 'boolean',
			default: false
		}
	}, (argv) => {
		run_all_locally(argv['only-deps'])
	})
	.command('test', 'run all tests', () => {}, (argv) => {
		console.log("Testing 1. 2. 3.");
	})
	.argv

import yargs from 'yargs'
import * as dotenv from 'dotenv'
import LabeledProcessRunner from './runner.js'
import * as http from 'http'

// load .env
dotenv.config()

// run_db_locally runs the local db
async function run_db_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('db yarn', ['yarn', 'install'], 'services/database')
	await runner.run_command_and_output('db svls', ['serverless', 'dynamodb', 'install'], 'services/database')
	runner.run_command_and_output('db', ['serverless', '--stage', 'local', 'dynamodb', 'start', '--migrate'], 'services/database')

}

// run_api_locally uses the serverless-offline plugin to run the api lambdas locally
async function run_api_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('api deps', ['yarn', 'install'], 'services/app-api')
	runner.run_command_and_output('api', ['serverless', '--stage', 'local', '--region', 'us-east-1', 'offline', '--httpPort', '3030', 'start'], 'services/app-api')
	
}

// run_s3_locally runs s3 locally
async function run_s3_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('s3 yarn', ['yarn', 'install'], 'services/uploads')
	runner.run_command_and_output('s3', ['serverless', '--stage', 'local', 's3', 'start'], 'services/uploads')

}

// run_fe_locally runs the frontend and its dependencies locally
async function run_web_locally(runner: LabeledProcessRunner) {

	await runner.run_command_and_output('web deps', ['yarn', 'install'], 'services/app-web')

	runner.run_command_and_output('web', ['yarn', 'start'], 'services/app-web')
	
}

// run_all_locally runs all of our services locally
async function run_all_locally() {
	const runner = new LabeledProcessRunner()

	run_db_locally(runner)
	run_s3_locally(runner)
	run_api_locally(runner)
	run_web_locally(runner)
}

async function run_all_tests(run_unit: boolean, run_online: boolean) {
	const runner = new LabeledProcessRunner()
	if (run_unit) {
		run_unit_tests(runner)
	}

	if (run_online) {
		run_online_tests(runner)
	}

}

async function run_unit_tests(runner: LabeledProcessRunner) {
	runner.run_command_and_output('web - unit', ['yarn', 'test:unit'], 'services/app-web')
	runner.run_command_and_output('api - unit', ['yarn', 'test'], 'services/app-api')
}

async function run_online_tests(runner: LabeledProcessRunner) {
	const base_url = process.env.APPLICATION_ENDPOINT

	if (base_url == undefined) {
		console.log('You must set APPLICATION_ENDPOINT to run online tests.')
		return
	}

	// if the URL doesn't resolve, print an error message
	http.get(base_url, () => {
		runner.run_command_and_output('web - a11y', ['yarn', 'test:a11y'], 'services/app-web')
		runner.run_command_and_output('nightwatch', ['./test.sh'], 'tests')
	}).on('error', (err) => {
		console.log(`The URL ${base_url} does not resolve. Make sure the service is running before running online tests.\n`)
		console.log(err)
		return
	})

}

// The command definitions in yargs
// All valid arguments to dev should be enumerated here, this is the entrypoint to the script
yargs(process.argv.slice(2))
	.command('local', 'run system locally', {}, () => {
		run_all_locally()
	})
	.command('test', 'run tests. If no flags are passed, runs both --unit and --online', (yargs) => {
		return yargs.boolean('unit')
							.boolean('online')
	}, (args) => {
		let run_unit = false
		let run_online = false

		// If no test flags are passed, default to running everything.
		if (args.unit == null && args.online == null) {
			run_unit = true
			run_online = true
		} else {
			if (args.unit) {
				run_unit = true
			}
			if (args.online) {
				run_online = true
			}
		}

		run_all_tests(run_unit, run_online)
	})
	.demandCommand(1, '') // this prints out the help if you don't call a subcommand
	.argv

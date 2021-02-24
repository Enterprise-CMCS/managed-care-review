import yargs from 'yargs'
import * as dotenv from 'dotenv'
import request from 'request'
import { spawnSync } from 'child_process'
import LabeledProcessRunner from './runner.js'
import { envFileMissingExamples } from './env.js' // What the WHAT? why doesn't this import right without the `.js`??

// run_db_locally runs the local db
async function run_db_locally(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'db yarn',
        ['yarn', 'install'],
        'services/database'
    )
    await runner.run_command_and_output(
        'db svls',
        ['serverless', 'dynamodb', 'install'],
        'services/database'
    )
    runner.run_command_and_output(
        'db',
        ['serverless', '--stage', 'local', 'dynamodb', 'start', '--migrate'],
        'services/database'
    )
}

// run_api_locally uses the serverless-offline plugin to run the api lambdas locally
async function run_api_locally(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'api deps',
        ['yarn', 'install'],
        'services/app-api'
    )
    runner.run_command_and_output(
        'api',
        [
            'serverless',
            '--stage',
            'local',
            '--region',
            'us-east-1',
            'offline',
            '--httpPort',
            '3030',
            'start',
        ],
        'services/app-api'
    )
}

// run_s3_locally runs s3 locally
async function run_s3_locally(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        's3 yarn',
        ['yarn', 'install'],
        'services/uploads'
    )
    runner.run_command_and_output(
        's3',
        ['serverless', '--stage', 'local', 's3', 'start'],
        'services/uploads'
    )
}

// run_web_locally runs app-web locally
async function run_web_locally(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'web deps',
        ['yarn', 'install'],
        'services/app-web'
    )
    runner.run_command_and_output('web', ['yarn', 'start'], 'services/app-web')
}

async function run_sb_locally(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'web deps',
        ['yarn', 'install'],
        'services/app-web'
    )
    runner.run_command_and_output(
        'storybook',
        ['yarn', 'storybook'],
        'services/app-web'
    )
}

async function run_all_clean() {
    const runner = new LabeledProcessRunner()
    runner.run_command_and_output(
        'web deps',
        ['yarn', 'clean'],
        'services/app-web'
    )
}

// run_all_locally runs all of our services locally
async function run_all_locally() {
    const runner = new LabeledProcessRunner()

    run_db_locally(runner)
    run_s3_locally(runner)
    run_api_locally(runner)
    run_web_locally(runner)
    run_sb_locally(runner)
}

function check_url_is_up(url: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        request(url, {}, (err) => {
            if (err) {
                resolve(false)
            }
            resolve(true)
        })
    })
}

async function run_web_against_aws(
    stackNameOpt: string | undefined = undefined
) {
    let stackName = stackNameOpt !== undefined ? stackNameOpt : ''

    if (stackNameOpt == undefined) {
        // Get the current branch name. allow this to be overriden with a flag
        const branchNameProc = spawnSync('git', ['branch', '--show-current'])
        if (branchNameProc.status != 0) {
            console.log('failed to get the branch name out of git, whoopsie')
            process.exit(1)
        }

        stackName = branchNameProc.stdout.toString().trim()
    }

    console.log('fetching env vars for ', stackName)

    const opts = {
        cwd: './services',
        // env: Object.assign({}, process.env, {}),
    }

    const testOpts = Object.assign({}, opts, { cwd: 'services/ui-auth' })

    const test = spawnSync(
        'serverless',
        ['info', '--stage', stackName],
        testOpts
    )
    // console.log('REG', test)
    // console.log(test.stderr.toString('utf8'))
    // console.log(test.stdout.toString('utf8'))
    if (test.status != 0) {
        const serverlessErrorOutput = test.stdout.toString('utf8')

        if (
            serverlessErrorOutput.includes(
                'The security token included in the request is invalid'
            )
        ) {
            console.log(
                'Error: Invalid token attempting to read AWS Cloudformation\n',
                'Likely, you do not have aws configured right. You will need AWS tokens from cloudwatch configured\n',
                'See the README for more details.\n\n',
                serverlessErrorOutput
            )

            process.exit(1)
        } else if (
            serverlessErrorOutput.includes('Stack with id') &&
            serverlessErrorOutput.includes('does not exist')
        ) {
            console.log(
                `Error: stack with id ${stackName} does not exist\n`,
                "If you didn't set one explicitly, maybe you haven't pushed this branch yet to deploy a review app?"
            )
            process.exit(1)
        } else {
            console.log(
                'Unexpected Error attempting to read AWS Cloudformation:',
                serverlessErrorOutput
            )
            process.exit(2)
        }
    }

    const regionResult = spawnSync(
        './output.sh',
        ['ui-auth', 'Region', stackName],
        opts
    )
    if (regionResult.status != 0) {
        console.log(regionResult.stderr, regionResult.stdout)
        process.exit(1)
    }
    const region = regionResult.stdout.toString('utf8').trim()

    const idPoolResult = spawnSync(
        './output.sh',
        ['ui-auth', 'IdentityPoolId', stackName],
        opts
    )
    if (idPoolResult.status != 0) {
        console.log(idPoolResult.stderr, idPoolResult.stdout)
        process.exit(1)
    }
    const idPool = idPoolResult.stdout.toString('utf8').trim()

    const userPoolResult = spawnSync(
        './output.sh',
        ['ui-auth', 'UserPoolId', stackName],
        opts
    )
    if (userPoolResult.status != 0) {
        console.log(userPoolResult.stderr, userPoolResult.stdout)
        process.exit(1)
    }
    const userPool = userPoolResult.stdout.toString('utf8').trim()

    const userPoolClientResult = spawnSync(
        './output.sh',
        ['ui-auth', 'UserPoolClientId', stackName],
        opts
    )
    if (userPoolClientResult.status != 0) {
        console.log(userPoolClientResult.stderr, userPoolClientResult.stdout)
        process.exit(1)
    }
    const userPoolClient = userPoolClientResult.stdout.toString('utf8').trim()

    const apiBaseResult = spawnSync(
        './output.sh',
        ['app-api', 'ApiGatewayRestApiUrl', stackName],
        opts
    )
    if (apiBaseResult.status != 0) {
        console.log(apiBaseResult.stderr, apiBaseResult.stdout)
        process.exit(1)
    }
    const apiBase = apiBaseResult.stdout.toString('utf8').trim()

    console.log(region, idPool, userPool, userPoolClient, apiBase)
    // set them

    process.env.PORT = '3003'
    process.env.REACT_APP_LOCAL_LOGIN = 'false' // override local_login in .env
    process.env.REACT_APP_API_URL = apiBase
    process.env.REACT_APP_COGNITO_REGION = region
    process.env.REACT_APP_COGNITO_ID_POOL_ID = idPool
    process.env.REACT_APP_COGNITO_USER_POOL_ID = userPool
    process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID = userPoolClient

    // run it
    const runner = new LabeledProcessRunner()
    await runner.run_command_and_output(
        'deps',
        ['yarn', 'install'],
        'services/app-web'
    )
    runner.run_command_and_output(
        'hybrid',
        ['yarn', 'start'],
        'services/app-web'
    )
}

async function run_all_tests(run_unit: boolean, run_online: boolean) {
    const runner = new LabeledProcessRunner()

    try {
        if (run_unit) {
            await run_unit_tests(runner)
        }

        if (run_online) {
            await run_online_tests(runner)
        }
    } catch (e) {
        console.log('Testing Error', e)
        process.exit(1)
    }
}

async function run_unit_tests(runner: LabeledProcessRunner) {
    const webCode = await runner.run_command_and_output(
        'web - unit',
        ['yarn', 'test:unit'],
        'services/app-web'
    )
    if (webCode != 0) {
        throw new Error('web - unit FAILED')
    }

    const apiCode = await runner.run_command_and_output(
        'api - unit',
        ['yarn', 'test'],
        'services/app-api'
    )
    if (apiCode != 0) {
        throw new Error('api - unit failed')
    }
}

async function run_online_tests(runner: LabeledProcessRunner) {
    const base_url = process.env.APPLICATION_ENDPOINT

    if (base_url == undefined) {
        console.log('You must set APPLICATION_ENDPOINT to run online tests.')
        return
    }

    const isUp = await check_url_is_up(base_url)
    if (!isUp) {
        throw new Error(
            `the URL ${base_url} does not resolve, make sure the system is running before runnin online tests`
        )
    }

    // TODO: Sort out how to use pa11y in CI.
    // const webCode = await runner.run_command_and_output('web - a11y', ['yarn', 'test:a11y'], 'services/app-web')
    // if (webCode != 0) {
    //  throw new Error('web - a11y tests FAILED')
    // }

    const nightCode = await runner.run_command_and_output(
        'nightwatch',
        ['./test.sh'],
        'tests'
    )
    if (nightCode != 0) {
        throw new Error('nightwatch tests FAILED')
    }
}

function main() {
    const missingExamples = envFileMissingExamples()
    if (missingExamples.length !== 0) {
        console.log(
            `ERROR: Your .env file is missing the keys: ${missingExamples.join(
                ', '
            )}\nAt least set an empty value before continuing.`
        )
        process.exit(2)
    }

    // load .env
    dotenv.config()

    // add git hash as APP_VERSION
    const appVersion = spawnSync('scripts/app_version.sh')
    process.env.APP_VERSION = appVersion.stdout.toString().trim()

    /* AVAILABLE COMMANDS
      The command definitions in yargs
      All valid arguments to dev should be enumerated here, this is the entrypoint to the script 
    */

    yargs(process.argv.slice(2))
        .command('clean', 'clean node dependencies', {}, () => {
            run_all_clean()
        })

        .command(
            'local',
            'run system locally. If no flags are passed, runs all services',
            (yargs) => {
                return yargs
                    .boolean('storybook')
                    .boolean('web')
                    .boolean('api')
                    .boolean('s3')
            },
            (args) => {
                // By default args will have 2 keys since it looks something like when run without a flag { _: [ 'local' ], '$0': 'build_dev/dev.js' }
                // Only allow one additional flag to be used by limiting keys to 3
                if (args && Object.keys(args).length > 3)
                    throw new Error(
                        'You can only run ./dev local without flags (for launching all services) or with one flag at a time'
                    )
                const runner = new LabeledProcessRunner()

                if (args.storybook) {
                    run_sb_locally(runner)
                } else if (args.web) {
                    run_web_locally(runner)
                } else if (args.api) {
                    run_api_locally(runner)
                } else if (args.s3) {
                    run_s3_locally(runner)
                } else {
                    run_all_locally()
                }
            }
        )
        .command(
            'hybrid',
            'run app-web against the review app',
            (yargs) => {
                return yargs.string('stack-name')
            },
            () => {
                run_web_against_aws()
            }
        )
        .command(
            'test',
            'run tests. If no flags are passed, runs both --unit and --online',
            (yargs) => {
                return yargs.boolean('unit').boolean('online')
            },
            (args) => {
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
            }
        )
        .demandCommand(1, '').argv // this prints out the help if you don't call a subcommand
}

// I'd love for there to be a check we can do like you do in python
// so that this is only executed if it's being run top-level, but the ones
// I found didn't work.
// I still like corralling all the script in main() anyway, b/c that keeps us from
// scattering running code all over.
main()

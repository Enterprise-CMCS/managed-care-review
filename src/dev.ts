import yargs from 'yargs'
import * as dotenv from 'dotenv'
import request from 'request'

import { commandMustSucceedSync } from './localProcess.js'
import LabeledProcessRunner from './runner.js'
import { envFileMissingExamples } from './env.js' // What the WHAT? why doesn't this import right without the `.js`??
import { checkStageAccess, getWebAuthVars } from './serverless.js'

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

async function run_all_lint() {
    const runner = new LabeledProcessRunner()
    runner.run_command_and_output(
        'lint',
        ['prettier', '.', '-w', '-u', '--ignore-path', '.gitignore'],
        '.'
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

// Pulls a bunch of configuration out of a given AWS environment and sets it as env vars for app-web to run against
// Note: The environment is made up of the _stage_ which defaults to your current git branch
// and the AWS Account, which is determined by which AWS credentials you get out of cloudtamer (dev, val, or prod) usually dev
async function run_web_against_aws(
    stageNameOpt: string | undefined = undefined
) {
    // by default, review apps are created with the stage name set as the current branch name
    const stageName =
        stageNameOpt !== undefined
            ? stageNameOpt
            : commandMustSucceedSync('git', ['branch', '--show-current'])

    console.log('Attempting to access stage:', stageName)
    // Test to see if we can read info from serverless. This is likely to trip folks up who haven't
    // configured their AWS keys correctly or if they have an invalid stage name.
    const serverlessConnection = checkStageAccess(stageName)
    switch (serverlessConnection) {
        case 'AWS_TOKEN_ERROR': {
            console.log(
                'Error: Invalid token attempting to read AWS Cloudformation\n',
                'Likely, you do not have aws configured right. You will need AWS tokens from cloudwatch configured\n',
                'See the AWS Token section of the README for more details.\n\n'
            )
            process.exit(1)
        }
        case 'STAGE_ERROR': {
            console.log(
                `Error: stack with id ${stageName} does not exist\n`,
                "If you didn't set one explicitly, maybe you haven't pushed this branch yet to deploy a review app?"
            )
            process.exit(1)
        }
        case 'UNKNOWN_ERROR': {
            console.log(
                'Unexpected Error attempting to read AWS Cloudformation.'
            )
            process.exit(2)
        }
    }

    // Now, we've confirmed we are configured to pull data out of serverless x cloudformation
    console.log('Access confirmed. Fetching config vars')
    const { region, idPool, userPool, userPoolClient } = getWebAuthVars(
        stageName
    )

    const apiBase = commandMustSucceedSync(
        './output.sh',
        ['app-api', 'ApiGatewayRestApiUrl', stageName],
        {
            cwd: './services',
        }
    )

    // set them
    process.env.PORT = '3003' // run hybrid on a different port
    process.env.REACT_APP_LOCAL_LOGIN = 'false' // override local_login in .env
    process.env.REACT_APP_API_URL = apiBase
    process.env.REACT_APP_COGNITO_REGION = region
    process.env.REACT_APP_COGNITO_ID_POOL_ID = idPool
    process.env.REACT_APP_COGNITO_USER_POOL_ID = userPool
    process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID = userPoolClient

    // run it
    const runner = new LabeledProcessRunner()
    await run_web_locally(runner)
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
    const appVersion = commandMustSucceedSync('scripts/app_version.sh')
    process.env.APP_VERSION = appVersion

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
                    .option('storybook', {
                        type: 'boolean',
                        describe: 'run storybook locally',
                        default: false,
                    })
                    .option('web', {
                        type: 'boolean',
                        describe: 'run web locally',
                        default: false,
                    })
                    .option('api', {
                        type: 'boolean',
                        describe: 'run api locally',
                        default: false,
                    })
                    .option('s3', {
                        type: 'boolean',
                        describe: 'run s3 locally',
                        default: false,
                    })
            },
            (args) => {
                const runner = new LabeledProcessRunner()

                if (!(args.storybook || args.web || args.api || args.s3)) {
                    // if no args were set, run everytihng.
                    run_all_locally()
                    return
                }

                if (args.storybook) {
                    run_sb_locally(runner)
                }
                if (args.web) {
                    run_web_locally(runner)
                }
                if (args.api) {
                    run_api_locally(runner)
                }
                if (args.s3) {
                    run_s3_locally(runner)
                }
            }
        )
        .command(
            'hybrid',
            'run app-web locally connected to the review app deployed for this branch',
            (yargs) => {
                return yargs.option('stage', {
                    type: 'string',
                    describe:
                        'an alternative Serverless stage in your AWS account to run against',
                })
            },
            (args) => {
                run_web_against_aws(args.stage)
            }
        )
        .command(
            'test',
            'run tests. If no flags are passed runs both --unit and --online',
            (yargs) => {
                return yargs
                    .option('unit', {
                        type: 'boolean',
                        describe: 'run all unit tests',
                        default: false,
                    })
                    .option('online', {
                        type: 'boolean',
                        describe:
                            'run run all tests that run against a live instance. Confiugre with APPLICATION_ENDPOINT',
                        default: false,
                    })
            },
            (args) => {
                // If no test flags are passed, default to running everything.
                if (!(args.unit || args.online)) {
                    args.unit = true
                    args.online = true
                }

                run_all_tests(args.unit, args.online)
            }
        )
        .command(
            'lint',
            'run all linters. This probably will be replaced by pre-commit.',
            {},
            () => {
                run_all_lint()
            }
        )
        .demandCommand(1, '')
        .help()
        .strict().argv // this prints out the help if you don't call a subcommand
}

// I'd love for there to be a check we can do like you do in python
// so that this is only executed if it's being run top-level, but the ones
// I found didn't work.
// I still like corralling all the script in main() anyway, b/c that keeps us from
// scattering running code all over.
main()

import yargs from 'yargs'
import * as dotenv from 'dotenv'
import request from 'request'

import { commandMustSucceedSync } from './localProcess.js'
import LabeledProcessRunner from './runner.js'
import { envFileMissingExamples } from './env.js' // What the WHAT? why doesn't this import right without the `.js`??
import { checkStageAccess, getWebAuthVars } from './serverless.js'
import { parseRunFlags } from './flags.js'
import { once } from './deps.js'

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
    compile_graphql_types_watch_once(runner)

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

async function compile_graphql_types_watch(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'gql deps',
        ['yarn', 'install'],
        'services/app-graphql'
    )

    return runner.run_command_and_output(
        'gqlgen',
        ['yarn', 'gqlgen', '--watch'],
        'services/app-graphql'
    )
}

const compile_graphql_types_watch_once = once(compile_graphql_types_watch)

async function compile_graphql_types(runner: LabeledProcessRunner) {
    await runner.run_command_and_output(
        'gql deps',
        ['yarn', 'install'],
        'services/app-graphql'
    )

    return runner.run_command_and_output(
        'gqlgen',
        ['yarn', 'gqlgen'],
        'services/app-graphql'
    )
}

const compile_graphql_types_once = once(compile_graphql_types)

// run_web_locally runs app-web locally
async function run_web_locally(runner: LabeledProcessRunner) {
    compile_graphql_types_watch_once(runner)

    await runner.run_command_and_output(
        'web deps',
        ['yarn', 'install'],
        'services/app-web'
    )
    runner.run_command_and_output('web', ['yarn', 'start'], 'services/app-web')
}

async function run_sb_locally(runner: LabeledProcessRunner) {
    compile_graphql_types_watch_once(runner)

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
        'web clean',
        ['yarn', 'clean'],
        'services/app-web'
    )
    runner.run_command_and_output(
        'api clean',
        ['yarn', 'clean'],
        'services/app-api'
    )
}

async function run_all_lint() {
    const runner = new LabeledProcessRunner()
    await runner.run_command_and_output(
        'web lint',
        ['yarn', 'lint'],
        'services/app-web'
    )
    await runner.run_command_and_output(
        'api lint',
        ['yarn', 'lint'],
        'services/app-api'
    )
}

async function run_all_format() {
    const runner = new LabeledProcessRunner()
    await runner.run_command_and_output(
        'format',
        ['prettier', '.', '-w', '-u', '--ignore-path', '.gitignore'],
        '.'
    )
}

async function run_all_generate() {
    const runner = new LabeledProcessRunner()
    await compile_graphql_types(runner)
}

// run_all_locally runs all of our services locally
type runLocalFlags = {
    runAPI: boolean
    runWeb: boolean
    runDB: boolean
    runS3: boolean
    runStoryBook: boolean
}
async function run_all_locally({
    runAPI,
    runWeb,
    runDB,
    runS3,
    runStoryBook,
}: runLocalFlags) {
    const runner = new LabeledProcessRunner()

    runDB && run_db_locally(runner)
    runS3 && run_s3_locally(runner)
    runAPI && run_api_locally(runner)
    runWeb && run_web_locally(runner)
    runStoryBook && run_sb_locally(runner)
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

    if (stageName === '') {
        console.log(
            'Error: you do not appear to be on a git branch so we cannot auto-detect what stage to attach to.\n',
            'Either checkout the deployed branch or specify --stage explicitly.'
        )
        process.exit(1)
    }

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
                `Error: stack with id ${stageName} does not exist or is not done deploying\n`,
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
    const {
        region,
        idPool,
        userPool,
        userPoolClient,
        userPoolDomain,
    } = getWebAuthVars(stageName)

    const apiBase = commandMustSucceedSync(
        './output.sh',
        ['app-api', 'ApiGatewayRestApiUrl', stageName],
        {
            cwd: './services',
        }
    )

    const apiAuthMode = commandMustSucceedSync(
        './output.sh',
        ['app-api', 'ApiAuthMode', stageName],
        {
            cwd: './services',
        }
    )

    // set them
    process.env.PORT = '3003' // run hybrid on a different port
    process.env.REACT_APP_AUTH_MODE = apiAuthMode // override local_login in .env
    process.env.REACT_APP_API_URL = apiBase
    process.env.REACT_APP_COGNITO_REGION = region
    process.env.REACT_APP_COGNITO_ID_POOL_ID = idPool
    process.env.REACT_APP_COGNITO_USER_POOL_ID = userPool
    process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID = userPoolClient
    process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_DOMAIN = userPoolDomain
    process.env.REACT_APP_APPLICATION_ENDPOINT = 'http://localhost:3003/'

    // run it
    const runner = new LabeledProcessRunner()
    await run_web_locally(runner)
}

async function run_all_tests({
    runUnit,
    runOnline,
}: {
    runUnit: boolean
    runOnline: boolean
}) {
    const runner = new LabeledProcessRunner()

    try {
        if (runUnit) {
            await run_unit_tests(runner)
        }

        if (runOnline) {
            await run_online_tests(runner)
        }
    } catch (e) {
        console.log('Testing Error', e)
        process.exit(1)
    }
}

async function run_unit_tests(runner: LabeledProcessRunner) {
    await compile_graphql_types_once(runner)

    await runner.run_command_and_output(
        'web deps',
        ['yarn', 'install'],
        'services/app-web'
    )

    const webCode = await runner.run_command_and_output(
        'web - unit',
        ['yarn', 'test:unit'],
        'services/app-web'
    )
    if (webCode != 0) {
        throw new Error('web - unit FAILED')
    }

    await runner.run_command_and_output(
        'api deps',
        ['yarn', 'install'],
        'services/app-api'
    )

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
                    })
                    .option('web', {
                        type: 'boolean',
                        describe: 'run web locally',
                    })
                    .option('api', {
                        type: 'boolean',
                        describe: 'run api locally',
                    })
                    .option('s3', {
                        type: 'boolean',
                        describe: 'run s3 locally',
                    })
                    .option('db', {
                        type: 'boolean',
                        describe: 'run database locally',
                    })
            },
            (args) => {
                const inputFlags = {
                    runAPI: args.api,
                    runWeb: args.web,
                    runDB: args.db,
                    runS3: args.s3,
                    runStoryBook: args.storybook,
                }

                const parsedFlags = parseRunFlags(inputFlags)

                if (parsedFlags === undefined) {
                    console.log(
                        "Error: Don't mix and match positive and negative boolean flags"
                    )
                    process.exit(1)
                }

                run_all_locally(parsedFlags)
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
                    })
                    .option('online', {
                        type: 'boolean',
                        describe:
                            'run run all tests that run against a live instance. Confiugre with APPLICATION_ENDPOINT',
                    })
            },
            (args) => {
                // If no test flags are passed, default to running everything.
                const inputFlags = {
                    runUnit: args.unit,
                    runOnline: args.online,
                }

                const parsedFlags = parseRunFlags(inputFlags)

                if (parsedFlags === undefined) {
                    console.log(
                        "Error: Don't mix and match positive and negative boolean flags"
                    )
                    process.exit(1)
                }

                run_all_tests(parsedFlags)
            }
        )
        .command(
            'format',
            'run format. This will be replaced by pre-commit',
            {},
            () => {
                run_all_format()
            }
        )
        .command(
            'lint',
            'run all linters. This will be replaced by pre-commit.',
            {},
            () => {
                run_all_lint()
            }
        )
        .command(
            'generate',
            'generate any code required for building. For now thats just GraphQL types.',
            {},
            () => {
                run_all_generate()
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

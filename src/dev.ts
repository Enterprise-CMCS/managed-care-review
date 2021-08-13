import yargs from 'yargs'
import request from 'request'
import { commandMustSucceedSync } from './localProcess.js'
import LabeledProcessRunner from './runner.js'

import { parseRunFlags } from './flags.js'

import {
    run_db_locally,
    run_api_locally,
    run_web_locally,
    run_sb_locally,
    run_s3_locally,
    run_web_against_aws,
    compile_graphql_types_once,
 } from './local/index.js'

 import {
     run_api_tests,
     run_api_tests_watch,
     run_web_tests,
     run_web_tests_watch,
     run_browser_tests,
 } from './test/index.js'

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
    await compile_graphql_types_once(runner)
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

async function run_all_tests({
    runUnit,
    runOnline,
    runDBInBackground,
}: {
    runUnit: boolean
    runOnline: boolean
    runDBInBackground: boolean
}) {
    const runner = new LabeledProcessRunner()

    if (runDBInBackground) {
        run_db_locally(runner)
    }

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
    // if the db is running in the background it prevents the process from exiting
    // one day we could have a cancellation to call, but this works just as well
    process.exit(0)
}

// run_unit_tests runs the api and web tests once, including coverage.
async function run_unit_tests(runner: LabeledProcessRunner) {
    const webCode = await run_web_tests(runner)

    if (webCode != 0) {
        throw new Error('web - unit FAILED')
    }

    const apiCode = await run_api_tests(runner)

    if (apiCode != 0) {
        throw new Error('api - unit failed')
    }
}

// DEPRECATED run_online_tests runs nightwatch once.
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
    // check to see if local direnv vars have loaded
    if (!process.env.REACT_APP_AUTH_MODE) {
        console.log(
            `ERROR: Could not find REACT_APP_AUTH_MODE environment variable.\n
            Did you set your env vars locally? Hint: try running 'direnv allow'.`
        )
        process.exit(2)
    }

    // add git hash as APP_VERSION
    const appVersion = commandMustSucceedSync('scripts/app_version.sh')
    process.env.APP_VERSION = appVersion

    /* AVAILABLE COMMANDS
      The command definitions in yargs
      All valid arguments to dev should be enumerated here, this is the entrypoint to the script
    */

    yargs(process.argv.slice(2))
        .scriptName('dev')
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
                    .option('run-db', {
                        type: 'boolean',
                        default: false,
                        describe:
                            'runs the ./dev local --db command before starting testing',
                    })
                    .command(
                        ['check', '*'], // adding '*' here makes this subcommand the default command
                        'run all tests once, exiting non-zero on failure and generating coverage data. These are all the tests run by CI',
                        (yargs) => {
                            return yargs
                                .option('unit', {
                                    type: 'boolean',
                                    describe: 'run all unit tests',
                                })
                                .option('online', {
                                    type: 'boolean',
                                    describe:
                                        'run run all tests that run against a live instance. Configure with APPLICATION_ENDPOINT',
                                })
                        },
                        (args) => {
                            // all args that come after a `--` hang out in args._, along with the command name(s)
                            // they can be strings or numbers so we map them before passing them on
                            // If no test flags are passed, default to running everything.
                            const inputRunFlags = {
                                runUnit: args.unit,
                                runOnline: args.online,
                            }

                            const runFlags = parseRunFlags(inputRunFlags)

                            if (runFlags === undefined) {
                                console.log(
                                    "Error: Don't mix and match positive and negative boolean flags"
                                )
                                process.exit(1)
                            }

                            const testingFlags = {
                                ...runFlags,
                                runDBInBackground: args['run-db'],
                            }

                            run_all_tests(testingFlags)
                        }
                    )
                    .command(
                        'api',
                        'run & watch api jest tests. Any args passed after a -- will be passed directly to jest',
                        (yargs) => {
                            return yargs.example([
                                [
                                    '$0 test api',
                                    'run the api jest tests, rerunning on save',
                                ],
                                [
                                    '$0 test api -- -t submit',
                                    'run tests that match the pattern /submit/',
                                ],
                                [
                                    '$0 test api -- --watchAll=false',
                                    'run the tests once and exit',
                                ],
                            ])
                        },
                        (args) => {
                            // all args that come after a `--` hang out in args._, along with the command name(s)
                            // they can be strings or numbers so we map them before passing them on
                            const unparsedJestArgs = args._.slice(2).map(
                                (intOrString) => {
                                    return intOrString.toString()
                                }
                            )
                            run_api_tests_watch(unparsedJestArgs, args['run-db'])
                        }
                    )
                    .command(
                        'web',
                        'run & watch web jest tests. Any args passed after a -- will be passed directly to jest',
                        (yargs) => {
                            return yargs.example([
                                [
                                    '$0 test web',
                                    'run the web jest tests, rerunning on save',
                                ],
                                [
                                    '$0 test web -- -t submit',
                                    'run tests that match the pattern /submit/',
                                ],
                                [
                                    '$0 test web -- --watchAll=false',
                                    'run the tests once and exit',
                                ],
                            ])
                        },
                        (args) => {
                            // all args that come after a `--` hang out in args._, along with the command name(s)
                            // they can be strings or numbers so we map them before passing them on
                            const unparsedJestArgs = args._.slice(2).map(
                                (intOrString) => {
                                    return intOrString.toString()
                                }
                            )
                            run_web_tests_watch(unparsedJestArgs)
                        }
                    )
                    .command(
                        'browser',
                        'run & watch cypress browser tests. Default command is `cypress open`. Any args passed after a -- will be passed to cypress instead. This requires a URL to run against, configured with APPLICATION_ENDPOINT',
                        (yargs) => {
                            return yargs.example([
                                [
                                    '$0 test browser',
                                    'launch the cypress test runner',
                                ],
                                [
                                    '$0 test browser -- run',
                                    'run all the cypress tests once from the CLI',
                                ],
                            ])
                        },
                        (args) => {
                            // all args that come after a `--` hang out in args._, along with the command name(s)
                            // they can be strings or numbers so we map them before passing them on
                            const unparsedCypressArgs = args._.slice(2).map(
                                (intOrString) => {
                                    return intOrString.toString()
                                }
                            )
                            run_browser_tests(unparsedCypressArgs)
                        }
                    )
            },
            () => {
                console.log(
                    "with a default subcommand, I don't think this code can be reached"
                )
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

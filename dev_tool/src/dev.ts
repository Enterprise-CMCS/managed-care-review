import { spawn } from 'child_process'
import yargs from 'yargs'
import { parseRunFlags } from './flags.js'
import { cloneDBLocally } from './jumpbox.js'
import {
    compileGraphQLTypesOnce,
    compileProto,
    runAPILocally,
    runPostgresLocally,
    runOtelLocally,
    runS3Locally,
    runStorybookLocally,
    runWebAgainstAWS,
    runWebAgainstDocker,
    runWebLocally,
    installPrismaDeps,
} from './local/index.js'
import { commandMustSucceedSync } from './localProcess.js'
import LabeledProcessRunner from './runner.js'
import {
    runAPITests,
    runAPITestsWatch,
    runBrowserTests,
    runBrowserTestsInDocker,
    runWebTests,
    runWebTestsWatch,
} from './test/index.js'

// Run clean commands from every single lerna package. For a list, run yarn lerna list from the root.
async function runAllClean() {
    const runner = new LabeledProcessRunner()
    await runner.runCommandAndOutput(
        'clean',
        ['npx', 'lerna', 'run', 'clean'],
        ''
    )
}

// Run lint commands from every single lerna package. For a list, run yarn lerna list from the root.
async function runAllLint() {
    const runner = new LabeledProcessRunner()
    await runner.runCommandAndOutput(
        'lint',
        ['npx', 'lerna', 'run', 'lint'],
        ''
    )
}

// Rebuild- this is for use after .dev clean
// Runs yarn install, tsc, generate compiled types
async function runAllBuild(runner: LabeledProcessRunner) {
    await runner.runCommandAndOutput('yarn install', ['npx', 'yarn'], '')
    await runAllGenerate()
    await runner.runCommandAndOutput(
        'build',
        ['npx', 'lerna', 'run', 'build'],
        ''
    )
}

async function runAllFormat() {
    const runner = new LabeledProcessRunner()
    await runner.runCommandAndOutput(
        'format',
        ['npx', 'lerna', 'run', 'prettier'],
        ''
    )
}

// create generated types for graphql, proto, prisma
async function runAllGenerate() {
    const runner = new LabeledProcessRunner()
    await compileGraphQLTypesOnce(runner)
    await compileProto(runner)
    await installPrismaDeps(runner)
}

// runAllLocally runs all of our services locally
type runLocalFlags = {
    runAPI: boolean
    runWeb: boolean
    runPostgres: boolean
    runOtel: boolean
    runS3: boolean
}
async function runAllLocally({
    runAPI,
    runWeb,
    runPostgres,
    runOtel,
    runS3,
}: runLocalFlags) {
    const runner = new LabeledProcessRunner()

    await Promise.all([
        runPostgres && runPostgresLocally(runner),
        runOtel && runOtelLocally(runner),
        runS3 && runS3Locally(runner),
        runAPI && runAPILocally(runner),
        runWeb && runWebLocally(runner),
    ])
}

async function runAllTests({
    runUnit,
    runOnline,
}: {
    runUnit: boolean
    runOnline: boolean
}) {
    const runner = new LabeledProcessRunner()

    try {
        if (runUnit) {
            await runUnitTests(runner)
        }

        if (runOnline) {
            await runOnlineTests()
        }
    } catch (e) {
        console.info('Testing Error', e)
        process.exit(1)
    }
}

// runUnitTests runs the api and web tests once, including coverage.
async function runUnitTests(runner: LabeledProcessRunner) {
    const webCode = await runWebTests(runner)

    if (webCode != 0) {
        throw new Error('web - unit FAILED')
    }

    const apiCode = await runAPITests(runner)

    if (apiCode != 0) {
        throw new Error('api - unit failed')
    }
}

// runOnlineTests runs cypress once
async function runOnlineTests() {
    // passing run changes the command from cypress open to cypress run.
    await runBrowserTests(['run'])
}

function runPrisma(args: string[]) {
    const proc = spawn('prisma', args, {
        cwd: 'services/app-api',
        stdio: 'inherit',
    })

    proc.on('close', (code) => {
        process.exit(code ? code : 0)
    })
}

async function main() {
    // check to see if local direnv vars have loaded
    if (!process.env.VITE_APP_AUTH_MODE) {
        console.info(
            `ERROR: Could not find VITE_APP_AUTH_MODE environment variable.\n
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

    await yargs(process.argv.slice(2))
        .scriptName('dev')
        .command(
            'local',
            'run system locally. If no flags are passed, runs all services',
            (yargs) => {
                return yargs
                    .command(
                        ['all', '*'], // adding '*' here makes this subcommand the default command
                        'runs all local services. You can exclude specific services with --no-* like --no-web',
                        (yargs) => {
                            return yargs
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
                                .option('postgres', {
                                    type: 'boolean',
                                    describe: 'run postgres locally',
                                })
                                .option('otel', {
                                    type: 'boolean',
                                    describe: 'run otel locally',
                                })
                                .example([
                                    ['$0 local', 'run all local services'],
                                    [
                                        '$0 local --no-web',
                                        'run all services except web',
                                    ],
                                    [
                                        '$0 local --api --postgres',
                                        'run app-api and the databse',
                                    ],
                                ])
                        },
                        async (args) => {
                            const inputFlags = {
                                runAPI: args.api,
                                runWeb: args.web,
                                runPostgres: args.postgres,
                                runOtel: args.otel,
                                runS3: args.s3,
                            }

                            const parsedFlags = parseRunFlags(inputFlags)

                            if (parsedFlags === undefined) {
                                console.info(
                                    "Error: Don't mix and match positive and negative boolean flags"
                                )
                                process.exit(1)
                            }

                            await runAllLocally(parsedFlags)
                        }
                    )
                    .command(
                        'api',
                        'run app-api locally. Will run the graphql compiler too.',
                        () => {
                            const runner = new LabeledProcessRunner()

                            runAPILocally(runner)
                        }
                    )
                    .command(
                        'web',
                        'run app-web locally. Will run the graphql compiler too. Has options to configure it to run against AWS or Docker',
                        (yargs) => {
                            return yargs
                                .option('hybrid', {
                                    type: 'boolean',
                                    describe:
                                        'run app-web locally configured to talk to a backend deployed in AWS. Defaults to the review app associated with the current branch.',
                                })
                                .option('hybrid-stage', {
                                    type: 'string',
                                    describe:
                                        'an alternative Serverless stage in your AWS account to run against',
                                })
                                .option('for-docker', {
                                    type: 'boolean',
                                    describe:
                                        'run app-web locally configured to be called from within a docker container. This is designed to be paired with `./dev test browser --in-docker`',
                                })
                        },
                        (args) => {
                            if (args['for-docker'] && args.hybrid) {
                                console.info(
                                    'Error: --hybrid and --for-docker are mutually exclusive'
                                )
                                process.exit(2)
                            }

                            if (args.hybrid) {
                                runWebAgainstAWS(args['hybrid-stage'])
                            } else if (args['for-docker']) {
                                console.info('run against docker')
                                runWebAgainstDocker()
                            } else {
                                const runner = new LabeledProcessRunner()
                                runWebLocally(runner)
                            }
                        }
                    )
                    .command(
                        'storybook',
                        'run storybook locally. Will run the graphql compiler too.',
                        () => {
                            const runner = new LabeledProcessRunner()

                            runStorybookLocally(runner)
                        }
                    )
                    .command('s3', 'run s3 locally', () => {
                        const runner = new LabeledProcessRunner()

                        runS3Locally(runner)
                    })
                    .command('postgres', 'run postgres locally.', () => {
                        const runner = new LabeledProcessRunner()

                        runPostgresLocally(runner)
                    })
            },
            () => {
                console.info(
                    "with a default subcommand, I don't think this code can be reached"
                )
            }
        )
        .command('rebuild', 'rebuild modules and types manually', () => {
            const runner = new LabeledProcessRunner()

            runAllBuild(runner)
        })
        .command(
            'test',
            'run tests. If no flags are passed runs both --unit and --online',
            (yargs) => {
                return yargs
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
                            // If no test flags are passed, default to running everything.
                            const inputRunFlags = {
                                runUnit: args.unit,
                                runOnline: args.online,
                            }

                            const runFlags = parseRunFlags(inputRunFlags)

                            if (runFlags === undefined) {
                                console.info(
                                    "Error: Don't mix and match positive and negative boolean flags"
                                )
                                process.exit(1)
                            }

                            const testingFlags = {
                                ...runFlags,
                            }

                            runAllTests(testingFlags)
                        }
                    )
                    .command(
                        'api',
                        'run & watch api jest tests. Any args passed after a -- will be passed directly to jest',
                        (yargs) => {
                            return yargs
                                .option('unit', {
                                    type: 'boolean',
                                    describe: 'run tests with coverage data',
                                })
                                .example([
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
                        async (args) => {
                            // all args that come after a `--` hang out in args._, along with the command name(s)
                            // they can be strings or numbers so we map them before passing them on
                            const unparsedJestArgs = args._.slice(2).map(
                                (intOrString) => {
                                    return intOrString.toString()
                                }
                            )
                            if (args.unit) {
                                const runner = new LabeledProcessRunner()
                                process.exit(await runAPITests(runner))
                            }

                            runAPITestsWatch(unparsedJestArgs)
                        }
                    )
                    .command(
                        'web',
                        'run & watch web jest tests. Any args passed after a -- will be passed directly to jest',
                        (yargs) => {
                            return yargs
                                .option('unit', {
                                    type: 'boolean',
                                    describe: 'run tests with coverage data',
                                })
                                .example([
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
                        async (args) => {
                            // all args that come after a `--` hang out in args._, along with the command name(s)
                            // they can be strings or numbers so we map them before passing them on
                            const unparsedJestArgs = args._.slice(2).map(
                                (intOrString) => {
                                    return intOrString.toString()
                                }
                            )
                            if (args.unit) {
                                const runner = new LabeledProcessRunner()
                                process.exit(await runWebTests(runner))
                            }
                            runWebTestsWatch(unparsedJestArgs)
                        }
                    )
                    .command(
                        'browser',
                        'run & watch cypress browser tests. Default command is `cypress open`. Any args passed after a -- will be used as the cypress cmd instead. This requires a URL to run against, configured with APPLICATION_ENDPOINT',
                        (yargs) => {
                            return yargs
                                .option('in-docker', {
                                    type: 'boolean',
                                    describe:
                                        'run cypress in a linux docker container that better matches the environment cypress is run in in CI. N.B. requires running app-web with --for-docker in order to work. Ignores APPLICATION_ENDPOINT in favor of docker networking.',
                                })
                                .example([
                                    [
                                        '$0 test browser',
                                        'launch the cypress test runner',
                                    ],
                                    [
                                        '$0 test browser -- run',
                                        'run all the cypress tests once from the CLI',
                                    ],
                                    [
                                        '$0 test browser --in-docker',
                                        'run all the cypress tests once in a CI-like docker container',
                                    ],
                                    [
                                        '$0 test browser --in-docker -- run --spec services/cypress/integration/stateSubmission.spec.ts',
                                        'run the stateSubmission cypress tests once in a CI-like docker container',
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

                            if (args['in-docker']) {
                                runBrowserTestsInDocker(unparsedCypressArgs)
                            } else {
                                runBrowserTests(unparsedCypressArgs)
                            }
                        }
                    )
            },
            () => {
                console.info(
                    "with a default subcommand, I don't think this code can be reached"
                )
            }
        )
        .command('jumpbox', 'run commands on a jumpbox', (yargs) => {
            return yargs
                .command(
                    'clone <env>',
                    'copy the database in the given aws environment locally',
                    (yargs) => {
                        return yargs
                            .positional('env', {
                                describe:
                                    'the environment to clone from. You must have AWS credentials configured for this environment.',
                                demandOption: true,
                                type: 'string',
                                choices: ['dev', 'val', 'prod'],
                            })
                            .option('stop-after', {
                                type: 'boolean',
                                default: true,
                            })
                            .option('ssh-key', {
                                type: 'string',
                                default: '~/.ssh/id_rsa',
                            })
                            .example([
                                [
                                    '$0 jumpbox clone dev',
                                    'clone the db from the dev AWS environment to your local machine',
                                ],
                            ])
                    },
                    async (args) => {
                        await cloneDBLocally(
                            args.env,
                            args.sshKey,
                            args.stopAfter
                        )
                    }
                )
                .demandCommand(1, 'you must pick a subcommand for jumpbox')
        })
        .command(
            'prisma',
            'run the prisma command in app-api. all arguments after -- will be passed directly into the prisma command.',
            (yargs) => {
                return yargs.example([
                    [
                        '$0 prisma -- db push',
                        'push the current config in schema.prisma into the db and generate a new client',
                    ],
                    [
                        '$0 prisma -- migrate dev',
                        'generate a new migration that will bring other databases into sync with schema.prisma and apply it to your local db',
                    ],
                    [
                        '$0 prisma -- migrate dev --only-create',
                        'generates a new migration based on schema.prisma but does not apply it. This lets you modify the SQL if it doesnt capture your intent correctly',
                    ],
                ])
            },
            (args) => {
                const prismaArgs = args._.slice(1).map((intOrString) => {
                    return intOrString.toString()
                })

                runPrisma(prismaArgs)
            }
        )
        .command('clean', 'clean node dependencies', {}, () => {
            runAllClean()
        })
        .command(
            'format',
            'run format. This will be replaced by pre-commit',
            {},
            () => {
                runAllFormat()
            }
        )
        .command(
            'lint',
            'run all linters. This will be replaced by pre-commit.',
            {},
            () => {
                runAllLint()
            }
        )
        .command(
            'generate',
            'generate any code required for building. For now thats GraphQL types and the protobuf coder.',
            {},
            () => {
                runAllGenerate()
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

import { spawnSync } from 'child_process'
import LabeledProcessRunner from '../runner.js'
import { checkDockerInstalledAndRunning, checkURLIsUp } from '../deps.js'
import * as path from 'path'
import { checkStageAccess, getWebAuthVars } from '../serverless.js'
import { commandMustSucceedSync } from '../localProcess.js'
import { stageNameFromBranch } from '../local/web.js'

export async function runBrowserTests(cypressArgs: string[]) {
    let args = ['open']
    if (cypressArgs.length > 0) {
        args = cypressArgs
    }

    args = ['cypress'].concat(args)

    console.info(`running: npx ${args.join(' ')}`)
    spawnSync('npx', args, {
        cwd: 'services/cypress',
        stdio: 'inherit',
    })
}

async function buildCypressDockerImage(runner: LabeledProcessRunner) {
    await checkDockerInstalledAndRunning()

    // Docker caching means we can just run this every time for now.
    // But we could check to see if the current image is old and delete it in that case.
    return runner.runCommandAndOutput(
        'docker build',
        ['docker', 'build', '-t', 'gha-cypress:latest', '.'],
        'containers/gha-cypress'
    )
}

export async function runBrowserTestsAgainstAWS(
    stageNameOpt: string | undefined
) {
    if (!process.env.TEST_USERS_PASS) {
        console.info(
            `ERROR: Could not find TEST_USERS_PASS environment variable.\nDid you set your env vars locally? Hint: try running 'direnv allow'.\n`
        )
        process.exit(1)
    }

    if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        !process.env.AWS_SESSION_TOKEN
    ) {
        console.info(
            `ERROR: Could not find AWS credentials in environment variables.\nDid you set your env vars locally? Hint: try running 'direnv allow'.\n`
        )
        process.exit(1)
    }

    const stageName = stageNameOpt ?? stageNameFromBranch()

    if (stageName === '') {
        console.info(
            'Error: you do not appear to be on a git branch so we cannot auto-detect what stage to attach to.\n',
            'Either checkout the deployed branch or specify --stage-name explicitly.'
        )
        process.exit(1)
    }

    console.info('Attempting to access stage:', stageName)
    // Test to see if we can read info from serverless. This is likely to trip folks up who haven't
    // configured their AWS keys correctly or if they have an invalid stage name.

    const serverlessConnection = checkStageAccess(stageName)

    switch (serverlessConnection) {
        case 'AWS_TOKEN_ERROR': {
            console.info(
                'Error: Invalid token attempting to read AWS Cloudformation\n',
                'Likely, you do not have aws configured right. You will need AWS tokens from cloudwatch configured\n',
                'See the AWS Token section of the README for more details.\n\n'
            )
            process.exit(1)
        }
        // don't need a break because we exit
        // eslint-disable-next-line no-fallthrough
        case 'STAGE_ERROR': {
            console.info(
                `Error: stack with id ${stageName} does not exist or is not done deploying\n`,
                "If you didn't set one explicitly, maybe you haven't pushed this branch yet to deploy a review app?"
            )
            process.exit(1)
        }
        // don't need a break because we exit
        // eslint-disable-next-line no-fallthrough
        case 'UNKNOWN_ERROR': {
            console.info(
                'Unexpected Error attempting to read AWS Cloudformation.'
            )
            process.exit(2)
        }
    }

    // Now, we've confirmed we are configured to pull data out of serverless x cloudformation
    console.info('Access confirmed. Fetching config vars')
    const { region, idPool, userPool, userPoolClient } =
        getWebAuthVars(stageName)

    const apiBase = commandMustSucceedSync(
        './output.sh',
        ['infra-api', 'ApiGatewayRestApiUrl', stageName],
        {
            cwd: './services',
        }
    )

    const appUrl = commandMustSucceedSync(
        './output.sh',
        ['ui', 'CloudFrontEndpointUrl', stageName],
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

    console.info('Fetching config vars succeeded. Setting environment vars')

    // set them
    process.env.PORT = '5432' // run hybrid on a different port
    process.env.VITE_APP_AUTH_MODE = apiAuthMode // override local_login in .env
    process.env.VITE_APP_API_URL = apiBase
    process.env.COGNITO_REGION = region
    process.env.COGNITO_IDENTITY_POOL_ID = idPool
    process.env.COGNITO_USER_POOL_ID = userPool
    process.env.COGNITO_USER_POOL_WEB_CLIENT_ID = userPoolClient

    //run Cypress with configuring baseUrl to appUrl
    const args = ['cypress'].concat(['open', '--config', `baseUrl=${appUrl}`])
    console.info(`Starting cypress: npx ${args.join(' ')}`)
    spawnSync('npx', args, {
        cwd: 'services/cypress',
        stdio: 'inherit',
    })
}

export async function runBrowserTestsInDocker(cypressArgs: string[]) {
    const runner = new LabeledProcessRunner()

    const buildResult = await buildCypressDockerImage(runner)
    if (buildResult !== 0) {
        console.info('ERROR: building the CI docker image failed')
        process.exit(buildResult)
    }

    // check to see if you're running ./dev local --for-docker
    const isUp = await checkURLIsUp('http://localhost:3005')
    if (!isUp) {
        console.info(
            'in order to run cypress in docker, you need to run the front end configured correctly for docker. Run `./dev local web --for-docker` before running cypress.'
        )
        process.exit(2)
    }

    const baseUrlArgs = ['--config', 'baseUrl=http://host.docker.internal:3005']
    let cypressCommandArgs = ['run'].concat(baseUrlArgs)
    if (cypressArgs.length > 0) {
        for (const arg of cypressArgs) {
            if (arg.startsWith('baseUrl')) {
                console.info(
                    'WARNING: you have passed baseUrl into cypress but we override that in order to talk to our local app-web'
                )
            }
        }

        cypressCommandArgs = cypressArgs.concat(baseUrlArgs)
    }

    await runner.runCommandAndOutput(
        'docker cypress',
        [
            'docker',
            'run',
            '-v',
            `${path.join(process.cwd(), 'services/cypress')}:/mc-review`,
            '--workdir',
            '/mc-review/services',
            '--env',
            'VITE_APP_AUTH_MODE=LOCAL',
            'gha-cypress:latest',

            '/cypress/node_modules/.bin/cypress',

            ...cypressCommandArgs,
        ],
        '.'
    )
}

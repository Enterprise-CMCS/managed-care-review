import LabeledProcessRunner from '../runner.js'
import { once } from '../deps.js'
import { commandMustSucceedSync } from '../localProcess.js'
import { checkStageAccess, getWebAuthVars } from '../serverless.js'

import { compileGraphQLTypesWatchOnce } from './graphql.js'

async function installWebDeps(runner: LabeledProcessRunner) {
    return runner.runCommandAndOutput(
        'web deps',
        ['yarn', 'install'],
        'services/app-web'
    )
}

export const installWebDepsOnce = once(installWebDeps)

// runWebLocally runs app-web locally
export async function runWebLocally(runner: LabeledProcessRunner) {
    compileGraphQLTypesWatchOnce(runner)

    await installWebDepsOnce(runner)

    runner.runCommandAndOutput('web', ['yarn', 'start'], 'services/app-web')
}


// Pulls a bunch of configuration out of a given AWS environment and sets it as env vars for app-web to run against
// Note: The environment is made up of the _stage_ which defaults to your current git branch
// and the AWS Account, which is determined by which AWS credentials you get out of cloudtamer (dev, val, or prod) usually dev
export async function runWebAgainstAWS(
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
    const { region, idPool, userPool, userPoolClient, userPoolDomain } =
        getWebAuthVars(stageName)

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

    const s3Region = commandMustSucceedSync(
        './output.sh',
        ['uploads', 'Region', stageName],
        {
            cwd: './services',
        }
    )

    const s3DocsBucket = commandMustSucceedSync(
        './output.sh',
        ['uploads', 'DocumentUploadsBucketName', stageName],
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
    process.env.REACT_APP_S3_REGION = s3Region
    delete process.env.REACT_APP_S3_LOCAL_URL
    process.env.REACT_APP_S3_DOCUMENTS_BUCKET = s3DocsBucket
    process.env.REACT_APP_APPLICATION_ENDPOINT = 'http://localhost:3003/'

    // run it
    const runner = new LabeledProcessRunner()
    await runWebLocally(runner)
}

// runWebAgainstDocker spins up web conifigured to be called from inside a local
// docker container. localhost does not resolve inside a local docker container, so everything
// needs to be routed according to the custom docker hostname instead.
export async function runWebAgainstDocker() {

    // configure all the right env vars
    process.env.PORT = '3005' // run docker-web on a different port
    process.env.REACT_APP_AUTH_MODE = 'LOCAL'
    process.env.REACT_APP_API_URL = 'http://host.docker.internal:3030/local'
    process.env.REACT_APP_S3_LOCAL_URL ='http://host.docker.internal:4569'

    const runner = new LabeledProcessRunner()
    await runWebLocally(runner)

}

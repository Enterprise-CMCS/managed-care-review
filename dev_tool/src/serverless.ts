import { spawnSync } from 'child_process'
import { commandMustSucceedSync } from './localProcess.js'

type StageConnection =
    | 'CONNECTED'
    | 'AWS_TOKEN_ERROR'
    | 'STAGE_ERROR'
    | 'UNKNOWN_ERROR'

export function checkStageAccess(stage: string): StageConnection {
    // Test to see if we can read info from serverless. This is likely to trip folks up who haven't
    // configured their AWS keys correctly or if they have an invalid stage name.
    const test = spawnSync('npx', ['serverless', 'info', '--stage', stage], {
        cwd: 'services/ui-auth',
    })
    if (test.status != 0) {
        const serverlessErrorOutput = test.stdout.toString('utf8')
        if (
            serverlessErrorOutput.includes(
                'The security token included in the request is invalid'
            )
        ) {
            return 'AWS_TOKEN_ERROR'
        } else if (
            serverlessErrorOutput.includes('Stack with id') &&
            serverlessErrorOutput.includes('does not exist')
        ) {
            return 'STAGE_ERROR'
        } else if (
            serverlessErrorOutput.includes(
                'Trying to request a non exported variable from CloudFormation'
            )
        ) {
            return 'STAGE_ERROR'
        } else {
            console.info(
                'Stdout: ',
                test.stdout.toString(),
                'stderr: ',
                test.stderr.toString()
            )
            return 'UNKNOWN_ERROR'
        }
    }

    return 'CONNECTED'
}

export function getWebAuthVars(stageName: string): {
    region: string
    idPool: string
    userPool: string
    userPoolClient: string
    userPoolDomain: string
} {
    const opts = {
        cwd: './services',
    }

    const region = commandMustSucceedSync(
        './output.sh',
        ['ui-auth', 'Region', stageName],
        opts
    )

    const idPool = commandMustSucceedSync(
        './output.sh',
        ['ui-auth', 'IdentityPoolId', stageName],
        opts
    )

    const userPool = commandMustSucceedSync(
        './output.sh',
        ['ui-auth', 'UserPoolId', stageName],
        opts
    )

    const userPoolClient = commandMustSucceedSync(
        './output.sh',
        ['ui-auth', 'UserPoolClientId', stageName],
        opts
    )

    const userPoolDomain = commandMustSucceedSync(
        './output.sh',
        ['ui-auth', 'UserPoolClientDomain', stageName],
        opts
    )

    return { region, idPool, userPool, userPoolClient, userPoolDomain }
}

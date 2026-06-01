import {
    GetFunctionConfigurationCommand,
    LambdaClient,
    UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda'
import type { Handler } from 'aws-lambda'

type RotationSucceededEvent = {
    detail?: {
        additionalEventData?: {
            SecretId?: string
        }
    }
}

const client = new LambdaClient({})

export const main: Handler = async (
    event: RotationSucceededEvent
): Promise<void> => {
    const secretId = event?.detail?.additionalEventData?.SecretId ?? ''
    const dbSecretName = process.env.DB_SECRET_NAME

    if (!dbSecretName) {
        throw new Error('DB_SECRET_NAME is required')
    }

    if (!secretId.includes(dbSecretName)) {
        console.info('Ignoring rotation event for unrelated secret:', secretId)
        return
    }

    const functionNames = (process.env.LAMBDA_FUNCTION_NAMES ?? '')
        .split(',')
        .filter(Boolean)
    const rotationTimestamp = new Date().toISOString()

    const results = await Promise.allSettled(
        functionNames.map(async (functionName) =>
            updateRotationTimestamp(functionName, rotationTimestamp)
        )
    )

    const failedFunctionNames: string[] = []

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            const functionName = functionNames[index]
            failedFunctionNames.push(functionName)
            console.error(
                'Failed to update ROTATION_TIMESTAMP',
                functionName,
                result.reason
            )
        }
    })

    if (failedFunctionNames.length === functionNames.length) {
        throw new Error('Failed to update ROTATION_TIMESTAMP on every function')
    }
}

async function updateRotationTimestamp(
    functionName: string,
    rotationTimestamp: string
): Promise<void> {
    const config = await client.send(
        new GetFunctionConfigurationCommand({
            FunctionName: functionName,
        })
    )
    const variables = config.Environment?.Variables ?? {}

    await client.send(
        new UpdateFunctionConfigurationCommand({
            FunctionName: functionName,
            Environment: {
                Variables: {
                    ...variables,
                    ROTATION_TIMESTAMP: rotationTimestamp,
                },
            },
        })
    )

    console.info('Updated ROTATION_TIMESTAMP for', functionName)
}

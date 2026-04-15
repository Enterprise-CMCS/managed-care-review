import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { GraphQLError } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import { computeArtifactVersion } from '../../../../ai-form-augmentation/src/versioning/artifactVersion'

export interface TriggerValidationResolverConfig {
    validationFunctionName: string
    artifactBucket: string
    region: string
    useLocalS3: boolean
}

export function triggerValidationResolver(
    store: Store,
    config: TriggerValidationResolverConfig
): MutationResolvers['triggerValidation'] {
    return async (_parent, { input }, _context: Context) => {
        const contractResult = await store.findContractWithHistory(
            input.contractID
        )

        if (contractResult instanceof Error) {
            const message = `Failed to load contract ${input.contractID}: ${contractResult.message}`
            logError('triggerValidation', message)

            if (contractResult instanceof NotFoundError) {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Validation is triggered while a user is still preparing a submission, so
        // the editable draft revision is the only version that should drive the
        // AI worker at this boundary.
        const revision = contractResult.draftRevision

        if (!revision) {
            const message = `Contract ${input.contractID} does not have a draft revision that can be validated`
            logError('triggerValidation', message)
            throw new GraphQLError(message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                    cause: 'MISSING_REVISION',
                },
            })
        }

        // artifactVersion is based only on persisted document keys. If a document
        // has not been saved to S3 yet, it cannot participate in downstream
        // retrieval artifacts or cache/version decisions.
        const documentKeys = revision.formData.contractDocuments
            .map((document) => document.s3Key)
            .filter((s3Key: string | undefined): s3Key is string =>
                Boolean(s3Key)
            )

        if (documentKeys.length === 0) {
            const message = `Contract ${input.contractID} does not have any contract documents with s3Key values`
            logError('triggerValidation', message)
            throw new GraphQLError(message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                    cause: 'MISSING_DOCUMENT_KEYS',
                },
            })
        }

        // artifactVersion fingerprints the current uploaded contract document set
        // so downstream status/results can be tied to the exact files under review
        // and invalidated cleanly when the document set changes.
        const artifactVersion = computeArtifactVersion(documentKeys)

        // The validation Lambda currently builds its own artifact S3 client, so
        // the resolver must pass enough S3 runtime config for local vs deployed execution.
        const payload = {
            formId: input.contractID,
            artifactVersion,
            bucket: config.artifactBucket,
            s3Config: config.useLocalS3
                ? {
                      region: config.region,
                      endpoint: 'http://localhost:4566',
                      forcePathStyle: true,
                      credentials: {
                          accessKeyId: 'test',
                          secretAccessKey: 'test', // pragma: allowlist secret
                      },
                  }
                : {
                      region: config.region,
                  },
        }

        try {
            const lambdaClient = new LambdaClient({
                region: config.region,
            })

            await lambdaClient.send(
                new InvokeCommand({
                    FunctionName: config.validationFunctionName,
                    // Trigger the worker asynchronously so GraphQL can return immediately.
                    // A later polling resolver is responsible for surfacing progress/results.
                    InvocationType: 'Event',
                    Payload: Buffer.from(JSON.stringify(payload)),
                })
            )

            console.info('triggerValidation invoked validation lambda', {
                contractID: input.contractID,
                artifactVersion,
                validationFunctionName: config.validationFunctionName,
            })

            logSuccess('triggerValidation')

            return {
                ok: true,
                artifactVersion,
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unknown lambda invocation error'

            logError('triggerValidation', message)

            throw new GraphQLError(
                `Failed to invoke validation for contract ${input.contractID}: ${message}`,
                {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'LAMBDA_INVOKE_FAILED',
                    },
                }
            )
        }
    }
}

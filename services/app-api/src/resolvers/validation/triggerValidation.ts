import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { formatCalendarDate } from '@mc-review/dates'
import { GraphQLError } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import type { ValidationSourceDocument } from '../../../../ai-form-augmentation/src/handlers'
import type { DateValidationFieldInput } from '../../../../ai-form-augmentation/src/prompts'
import { computeArtifactVersion } from '../../../../ai-form-augmentation/src/versioning/artifactVersion'
import { validationHandler } from '../../../../ai-form-augmentation/src/handlers'

export interface ValidationResolverConfig {
    validationFunctionName: string
    artifactBucket: string
    region: string
    useLocalS3: boolean
}

export function triggerValidationResolver(
    store: Store,
    config: ValidationResolverConfig
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
        const sourceDocuments: ValidationSourceDocument[] =
            revision.formData.contractDocuments.flatMap((document) => {
                if (!document.s3Key || !document.s3BucketName) {
                    return []
                }

                return [
                    {
                        documentName: document.name,
                        sourceBucket: document.s3BucketName,
                        sourceKey: document.s3Key,
                    },
                ]
            })

        const documentKeys = sourceDocuments.map(
            (document) => document.sourceKey
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
        // Convert the draft contract form into the narrow field/value payload the
        // AI worker validates. Keeping this shaping step in app-api means the
        // worker stays focused on document retrieval and comparison instead of
        // needing to understand the broader contract domain model.
        const formFields = buildValidationFormFields(revision.formData)

        if (formFields.length === 0) {
            const message = `Contract ${input.contractID} does not have any draft contract date values that can be validated`
            logError('triggerValidation', message)
            throw new GraphQLError(message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                    cause: 'MISSING_FORM_FIELDS',
                },
            })
        }

        // The worker needs both the current form values and the persisted source
        // documents so it can rebuild retrieval context from scratch for this
        // exact draft state. This payload is the boundary between app-api's
        // contract workflow and the AI pipeline's artifact-driven runtime.
        //
        // The validation Lambda currently builds its own artifact S3 client, so
        // the resolver must pass enough S3 runtime config for local vs deployed execution.
        const payload = {
            formId: input.contractID,
            artifactVersion,
            bucket: config.artifactBucket,
            formFields,
            documents: sourceDocuments,
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

        const isLocalExecution = config.useLocalS3

        try {
            if (isLocalExecution) {
                // Local development does not have a real downstream Lambda target, so we
                // execute the validation worker directly while preserving fire-and-forget behavior.
                void validationHandler(payload).catch((localError) => {
                    const message =
                        localError instanceof Error
                            ? localError.message
                            : 'Unknown local validation execution error'

                    logError('triggerValidation.localExecution', message)
                })

                console.info(
                    'triggerValidation started local validation handler',
                    {
                        contractID: input.contractID,
                        artifactVersion,
                    }
                )
            } else {
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
            }

            logSuccess('triggerValidation')

            return {
                ok: true,
                artifactVersion,
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unknown validation trigger error'

            logError('triggerValidation', message)

            throw new GraphQLError(
                `Failed to invoke validation for contract ${input.contractID}: ${message}`,
                {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'VALIDATION_TRIGGER_FAILED',
                    },
                }
            )
        }
    }
}

function buildValidationFormFields(formData: {
    contractDateStart?: Date
    contractDateEnd?: Date
}): DateValidationFieldInput[] {
    const fields: DateValidationFieldInput[] = []

    if (formData.contractDateStart) {
        // Serialize dates once at the API boundary so the worker always receives
        // stable prompt-ready values instead of mixing Date formatting concerns
        // into the document-processing runtime.
        fields.push({
            field: 'contractStartDate',
            label: 'Contract Start Date',
            value: formatCalendarDate(formData.contractDateStart, 'UTC'),
        })
    }

    if (formData.contractDateEnd) {
        fields.push({
            field: 'contractEndDate',
            label: 'Contract End Date',
            value: formatCalendarDate(formData.contractDateEnd, 'UTC'),
        })
    }

    return fields
}

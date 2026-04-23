import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { GraphQLError } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import type { ValidationSourceDocument } from '../../../../ai-form-augmentation/src/handlers'
import type {
    ValidationDocumentDiagnostic,
    ValidationWorkSelectionMode,
} from '../../../../ai-form-augmentation/src/results'
import { computeArtifactVersion } from '../../../../ai-form-augmentation/src/versioning/artifactVersion'
import {
    getEffectiveValidationDocumentKeys,
    selectEligibleValidationDocuments,
} from './validationDocumentKeys'
import { buildValidationFormFields } from './validationFormFields'

export type RuntimeValidationWorkSelectionMode = Extract<
    ValidationWorkSelectionMode,
    'all-doc' | 'gated-first-pass'
>

export interface ValidationResolverConfig {
    validationFunctionName: string
    artifactBucket: string
    region: string
    useLocalS3: boolean
    defaultWorkSelectionMode: RuntimeValidationWorkSelectionMode
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

        const { eligibleDocuments, skippedDocuments } =
            selectEligibleValidationDocuments(
                revision.formData.contractDocuments
            )

        if (skippedDocuments.length > 0) {
            console.info('triggerValidation skipped unsupported documents', {
                contractID: input.contractID,
                skippedDocumentCount: skippedDocuments.length,
                skippedDocuments,
            })
        }

        // Keep artifactVersion tied to the persisted document set so adding or
        // removing unsupported attachments still invalidates earlier diagnostics.
        const documentKeys = getEffectiveValidationDocumentKeys(
            revision.formData.contractDocuments,
            config.useLocalS3
        )

        // The worker remains PDF-only: unsupported documents stay visible in
        // trigger diagnostics but are excluded before invocation.
        const sourceDocuments: ValidationSourceDocument[] =
            eligibleDocuments.flatMap((document) => {
                if (!document.s3Key || !document.s3BucketName) {
                    return []
                }

                const [sourceKey] = getEffectiveValidationDocumentKeys(
                    [document],
                    config.useLocalS3
                )

                return [
                    {
                        documentName: document.name ?? document.s3Key,
                        sourceBucket: document.s3BucketName,
                        // Local uploads still persist the historical raw key in
                        // s3URL while app-api normalizes s3Key to allusers/... .
                        // The AI worker should follow the actual object location
                        // in local mode without changing the shared upload stack.
                        sourceKey,
                    },
                ]
            })

        if (sourceDocuments.length === 0) {
            const message = `Contract ${input.contractID} does not have any eligible PDF contract documents for validation`
            logError('triggerValidation', message)
            throw new GraphQLError(message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                    cause: 'MISSING_ELIGIBLE_DOCUMENTS',
                },
            })
        }

        const documentDiagnostics: ValidationDocumentDiagnostic[] =
            skippedDocuments.map((document) => ({
                documentName: document.documentName,
                status: 'skipped',
                usable: false,
                chunkCount: 0,
                reason: document.reason,
            }))

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
            documentDiagnostics,
            ...(config.defaultWorkSelectionMode === 'gated-first-pass'
                ? { workSelectionMode: 'gated-first-pass' as const }
                : {}),
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
                // Keep local validation out of the app-api module graph. Spawning
                // the AI worker in its own workspace process avoids pulling native
                // OCR/embedding dependencies into local-server startup and keeps
                // auth/API boot healthy even when validation is idle.
                startLocalValidationWorker(payload)

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

function startLocalValidationWorker(
    payload: Parameters<typeof JSON.stringify>[0]
): void {
    const repoRoot = resolve(process.cwd(), '../..')
    const childProcess = spawn(
        'pnpm',
        [
            '--filter',
            'ai-form-augmentation',
            'exec',
            'tsx',
            'src/runValidation.ts',
        ],
        {
            cwd: repoRoot,
            stdio: ['pipe', 'ignore', 'pipe'],
        }
    )

    childProcess.stdin?.end(JSON.stringify(payload))

    childProcess.stderr?.on('data', (chunk) => {
        logError(
            'triggerValidation.localExecution',
            Buffer.from(chunk).toString().trim()
        )
    })

    childProcess.on('error', (error) => {
        logError('triggerValidation.localExecution', error.message)
    })

    childProcess.on('exit', (code) => {
        if (code && code !== 0) {
            logError(
                'triggerValidation.localExecution',
                `Local validation worker exited with code ${code}`
            )
        }
    })
}

import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import { newArtifactS3Client } from '../../../../ai-form-augmentation/src/s3'
import {
    getValidationStatusKey,
    type ValidationStatusArtifact,
} from '../../../../ai-form-augmentation/src/status'
import {
    getValidationResultKey,
    type ValidationResultArtifact,
    type ValidationDocumentDiagnostic,
} from '../../../../ai-form-augmentation/src/results'
import { computeFormSnapshotHash } from '../../../../ai-form-augmentation/src/versioning'
import { computeArtifactVersion } from '../../../../ai-form-augmentation/src/versioning/artifactVersion'
import { buildArtifactVersionDocumentIdentity } from '../../../../ai-form-augmentation/src/versioning'
import type { ValidationResolverConfig } from './triggerValidation'
import {
    getEffectiveValidationDocumentKeys,
    getValidationDocumentIdentityInputs,
} from './validationDocumentKeys'
import { buildValidationFormFields } from './validationFormFields'

function buildValidationCoverageSummary(
    documentDiagnostics: ValidationDocumentDiagnostic[] | undefined
) {
    if (!documentDiagnostics || documentDiagnostics.length === 0) {
        return null
    }

    const skippedDocuments = documentDiagnostics.filter(
        (diagnostic) => diagnostic.status === 'skipped'
    ).length
    const failedDocuments = documentDiagnostics.filter(
        (diagnostic) => diagnostic.status === 'failed'
    ).length
    const ocrCappedDocuments = documentDiagnostics.filter(
        (diagnostic) => diagnostic.reason === 'ocr-capped-large-batch'
    ).length
    const deferredDocuments = documentDiagnostics.filter(
        (diagnostic) => diagnostic.reason === 'deferred-first-pass'
    ).length
    // Partial coverage should only reflect reviewable worker inputs that were
    // not fully processed. Trigger-time unsupported-file skips still appear in
    // the raw counts, but they do not mean the PDF worker had partial coverage.
    const unprocessedDocuments = documentDiagnostics.filter(
        (diagnostic) =>
            diagnostic.status !== 'processed' &&
            Boolean(diagnostic.sourceBucket) &&
            Boolean(diagnostic.sourceKey)
    ).length

    return {
        isPartial: unprocessedDocuments > 0,
        skippedDocuments,
        failedDocuments,
        ocrCappedDocuments,
        deferredDocuments,
        unprocessedDocuments,
    }
}

function getPreferredDocumentDiagnostics(args: {
    resultArtifact: ValidationResultArtifact | null
    statusArtifact: ValidationStatusArtifact | null
}): ValidationDocumentDiagnostic[] | undefined {
    // Completed results are the canonical diagnostic record. Status artifacts
    // only win when a result does not exist yet, such as in-progress or failed
    // runs that still need to surface partial coverage to the Review page.
    return (
        args.resultArtifact?.documentDiagnostics ??
        args.statusArtifact?.documentDiagnostics
    )
}

export function fetchValidationStatusResolver(
    store: Store,
    config: ValidationResolverConfig
): QueryResolvers['validationStatus'] {
    return async (_parent, { input }) => {
        const contractResult = await store.findContractWithHistory(
            input.contractID
        )

        if (contractResult instanceof Error) {
            const message = `Failed to load contract ${input.contractID}: ${contractResult.message}`
            logError('validationStatus', message)

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

        // Polling is tied to the user’s in-progress submission workflow, so the
        // current draft revision is the only source of truth for artifact status.
        const revision = contractResult.draftRevision

        if (!revision) {
            return {
                stage: 'not-started',
                artifactVersion: '',
                isStale: false,
                error: null,
                coverageSummary: null,
                results: [],
            }
        }

        // Only persisted contract documents with real s3Key values can
        // participate in artifact versioning and artifact lookup. If a
        // document has not been saved to S3 yet, there is nothing stable for
        // the polling resolver to compare against.
        const documentKeys = getEffectiveValidationDocumentKeys(
            revision.formData.contractDocuments,
            config.useLocalS3
        )
        const documentIdentityInputs = getValidationDocumentIdentityInputs(
            revision.formData.contractDocuments,
            config.useLocalS3
        )

        if (documentKeys.length === 0) {
            return {
                stage: 'not-started',
                artifactVersion: '',
                isStale: false,
                error: null,
                coverageSummary: null,
                results: [],
            }
        }

        // Recompute the version from the live draft document set on every poll.
        // This is what lets the resolver treat older status/results artifacts as
        // stale after the user changes the uploaded contract documents.
        const artifactVersion = computeArtifactVersion(
            documentIdentityInputs.map((document) =>
                buildArtifactVersionDocumentIdentity(document)
            )
        )
        const formSnapshotHash = computeFormSnapshotHash(
            buildValidationFormFields(revision.formData).map((field) => ({
                field: field.field,
                value: field.value,
            }))
        )

        // The polling path reads the same bucket the validation worker writes
        // to, so it uses the artifact-focused S3 client rather than the
        // app-api uploads/document helper.
        const artifactS3Client = newArtifactS3Client(
            config.useLocalS3
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
                  }
        )

        let statusArtifact: ValidationStatusArtifact | null = null
        try {
            statusArtifact =
                await artifactS3Client.getJson<ValidationStatusArtifact>(
                    config.artifactBucket,
                    getValidationStatusKey(input.contractID)
                )
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes('S3 object not found')
            ) {
                // Missing status is a normal polling condition when validation
                // has not started yet or has not written its first artifact.
                statusArtifact = null
            } else {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Unknown status artifact read error'

                logError('validationStatus', message)

                throw new GraphQLError(
                    `Failed to read validation status for contract ${input.contractID}: ${message}`,
                    {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'ARTIFACT_READ_FAILED',
                        },
                    }
                )
            }
        }

        let resultArtifact: ValidationResultArtifact | null = null
        try {
            resultArtifact =
                await artifactS3Client.getJson<ValidationResultArtifact>(
                    config.artifactBucket,
                    getValidationResultKey(input.contractID)
                )
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes('S3 object not found')
            ) {
                // Missing results are also normal while validation is still in
                // progress or before it has been triggered at all.
                resultArtifact = null
            } else {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Unknown validation result artifact read error'

                logError('validationStatus', message)

                throw new GraphQLError(
                    `Failed to read validation results for contract ${input.contractID}: ${message}`,
                    {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'ARTIFACT_READ_FAILED',
                        },
                    }
                )
            }
        }

        // No artifacts means validation has not started for the current draft.
        if (!statusArtifact && !resultArtifact) {
            logSuccess('validationStatus')

            return {
                stage: 'not-started',
                artifactVersion,
                isStale: false,
                error: null,
                coverageSummary: null,
                results: [],
            }
        }

        // Stale means the stored status was written for an older document set
        // and should not be trusted as the current pipeline state.
        if (
            statusArtifact &&
            statusArtifact.artifactVersion !== artifactVersion
        ) {
            logSuccess('validationStatus')

            return {
                stage: statusArtifact.stage,
                artifactVersion,
                isStale: true,
                error: null,
                coverageSummary: null,
                results: [],
            }
        }

        // Results can also go stale independently if the user changes files
        // after an older validation result was already written.
        if (
            resultArtifact &&
            resultArtifact.artifactVersion !== artifactVersion
        ) {
            logSuccess('validationStatus')

            return {
                stage: statusArtifact?.stage ?? 'complete',
                artifactVersion,
                isStale: true,
                error: null,
                coverageSummary: null,
                results: [],
            }
        }

        if (
            resultArtifact &&
            resultArtifact.formSnapshotHash !== formSnapshotHash
        ) {
            logSuccess('validationStatus')

            return {
                stage: statusArtifact?.stage ?? 'complete',
                artifactVersion,
                isStale: true,
                error: null,
                coverageSummary: null,
                results: [],
            }
        }

        const coverageSummary = buildValidationCoverageSummary(
            getPreferredDocumentDiagnostics({
                resultArtifact,
                statusArtifact,
            })
        )

        if (statusArtifact?.stage === 'failed') {
            logSuccess('validationStatus')

            return {
                stage: 'failed',
                artifactVersion,
                isStale: false,
                error: statusArtifact.error,
                coverageSummary,
                results: [],
            }
        }

        if (statusArtifact?.stage === 'complete' && resultArtifact) {
            logSuccess('validationStatus')

            return {
                stage: 'complete',
                artifactVersion,
                isStale: false,
                error: null,
                coverageSummary,
                results: resultArtifact.results,
            }
        }

        // Any other matching status artifact is treated as an in-progress poll
        // response so the frontend can keep polling without special-case logic.
        logSuccess('validationStatus')

        return {
            stage: statusArtifact?.stage ?? 'retrieving',
            artifactVersion,
            isStale: false,
            error: null,
            coverageSummary,
            results: [],
        }
    }
}

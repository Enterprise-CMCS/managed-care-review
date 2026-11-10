import { createForbiddenError, createUserInputError } from '../errorUtils'
import { isStateUser } from '../../domain-models'
import type {
    GenericDocumentInput,
    MutationResolvers,
} from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql/index'
import { parseContractDraftRevisionInput } from '../../domain-models/contractAndRates'
import { canSyntheticDataWrite, canWrite } from '../../oauth/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'

// Derives s3BucketName and s3Key for each document from its s3URL and keeps only
// the fields the draft schemas accept. sha256 is required on GenericDocumentInput,
// so it is always present after parsing.
const parseDraftDocuments = (
    documents: GenericDocumentInput[] | null | undefined
) =>
    parseAndValidateDocuments(
        documents?.map((d) => ({
            name: d.name,
            s3URL: d.s3URL,
            sha256: d.sha256,
        })) ?? [],
        'HEALTH_PLAN_DOCS'
    ).map((doc) => ({ ...doc, sha256: doc.sha256! }))

export function updateContractDraftRevision(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateContractDraftRevision'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'updateContractDraftRevision',
            { 'mcreview.package_id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (
                    !canWrite(context) &&
                    !canSyntheticDataWrite(
                        context,
                        'updateContractDraftRevision'
                    )
                ) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'updateContractDraftRevision',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                const featureFlags = await launchDarkly.allFlags({
                    key: context.user.email,
                })
                const { formData, contractID, lastSeenUpdatedAt } = input

                const contractWithHistory =
                    await store.findContractWithHistory(contractID)

                if (contractWithHistory instanceof Error) {
                    const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
                    logResolverError(
                        'updateContractDraftRevision',
                        errMessage,
                        context
                    )

                    if (contractWithHistory instanceof NotFoundError) {
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                // This resolver is only callable by state users from the same state as the contract
                if (
                    !isStateUser(context.user) ||
                    contractWithHistory.stateCode !== context.user.stateCode
                ) {
                    const msg = !isStateUser(context.user)
                        ? 'User not authorized to modify state data'
                        : 'User not authorized to fetch data from a different state'
                    logResolverError(
                        'updateContractDraftRevision',
                        msg,
                        context
                    )
                    throw createForbiddenError(msg)
                }

                if (
                    !contractWithHistory.draftRevision ||
                    contractWithHistory.status === 'SUBMITTED' ||
                    contractWithHistory.status === 'RESUBMITTED'
                ) {
                    const errMessage = `Contract is not in editable state. Contract: ${contractID} Status: ${contractWithHistory.status}`
                    logResolverError(
                        'updateContractDraftRevision',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage, 'contractID')
                }

                // If updatedAt does not match concurrent editing occurred.
                if (
                    contractWithHistory.draftRevision.updatedAt.getTime() !==
                    lastSeenUpdatedAt.getTime()
                ) {
                    const errMessage = `Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.`
                    logResolverError(
                        'updateContractDraftRevision',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage)
                }

                // parse and validate documents
                const formDataWithValidatedDocs = {
                    ...formData,
                    contractDocuments: parseDraftDocuments(
                        formData.contractDocuments
                    ),
                    supportingDocuments: parseDraftDocuments(
                        formData.supportingDocuments
                    ),
                    ilosDocuments: parseDraftDocuments(formData.ilosDocuments),
                }

                // Using zod to validate and transform GQL types into domain types
                const editableFormData = parseContractDraftRevisionInput(
                    contractWithHistory,
                    formDataWithValidatedDocs,
                    store,
                    featureFlags
                )

                if (editableFormData instanceof Error) {
                    const errMessage = editableFormData.message
                    logResolverError(
                        'updateContractDraftRevision',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage)
                }

                // Update contract draft revision
                const updateResult = await store.updateDraftContract({
                    contractID,
                    formData: editableFormData,
                })

                if (updateResult instanceof Error) {
                    const errMessage = `Error updating form data: ${contractID}:: ${updateResult.message}`
                    logResolverError(
                        'updateContractDraftRevision',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('updateContractDraftRevision', context)

                return {
                    contract: updateResult,
                }
            }
        )
    }
}

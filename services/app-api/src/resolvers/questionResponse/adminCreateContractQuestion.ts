import type { MutationResolvers } from '../../gen/gqlServer'
import {
    hasCMSPermissions,
    isAdminUser,
    isValidCmsDivison,
} from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { NotFoundError, type Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { canWrite } from '../../authorization/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'
import type {
    AdminCreateContractQuestionInput,
    DivisionType,
} from '../../domain-models'

// Lets an AdminUser record a question on behalf of CMS. The admin can either pick
// a division directly (the question is then attributed to the admin), or select a
// CMS user to ask on behalf of (the question's addedBy and division come from that
// user). No notification emails are sent.
export function adminCreateContractQuestionResolver(
    store: Store
): MutationResolvers['adminCreateContractQuestion'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'adminCreateContractQuestion',
            { 'contract.id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                // blocked from OAuth credential flow requests
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'adminCreateContractQuestion',
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

                if (!isAdminUser(user)) {
                    const msg =
                        'user not authorized to create an admin question round'
                    logResolverError(
                        'adminCreateContractQuestion',
                        msg,
                        context
                    )
                    throw createForbiddenError(msg)
                }

                if (input.documents.length === 0) {
                    const msg = 'question documents are required'
                    logResolverError(
                        'adminCreateContractQuestion',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                if (!input.reason.trim()) {
                    const msg = 'a reason is required'
                    logResolverError(
                        'adminCreateContractQuestion',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                if (input.createdAt && new Date(input.createdAt) > new Date()) {
                    const msg =
                        'the question created date cannot be in the future'
                    logResolverError(
                        'adminCreateContractQuestion',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                const contractResult = await store.findContractWithHistory(
                    input.contractID
                )
                if (contractResult instanceof Error) {
                    if (contractResult instanceof NotFoundError) {
                        const errMessage = `Package with id ${input.contractID} does not exist`
                        logResolverError(
                            'adminCreateContractQuestion',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: { code: 'NOT_FOUND' },
                        })
                    }

                    const errMessage = `Issue finding a package. Message: ${contractResult.message}`
                    logResolverError(
                        'adminCreateContractQuestion',
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

                // Resolve who the question is attributed to and which division it
                // belongs to. When a CMS user is selected, both come from that
                // user (asking on their behalf); otherwise it is the admin plus
                // the division they picked.
                let addedByUserID: string = user.id
                let division: DivisionType

                if (input.addedByUserID) {
                    const cmsUser = await store.findUser(input.addedByUserID)
                    if (cmsUser instanceof Error) {
                        const errMessage = `Issue finding user ${input.addedByUserID}. Message: ${cmsUser.message}`
                        logResolverError(
                            'adminCreateContractQuestion',
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
                    if (!cmsUser) {
                        const msg = `CMS user with id ${input.addedByUserID} does not exist`
                        logResolverError(
                            'adminCreateContractQuestion',
                            msg,
                            context
                        )
                        throw createUserInputError(msg)
                    }
                    if (!hasCMSPermissions(cmsUser)) {
                        const msg = 'addedByUserID must reference a CMS user'
                        logResolverError(
                            'adminCreateContractQuestion',
                            msg,
                            context
                        )
                        throw createUserInputError(msg)
                    }
                    addedByUserID = cmsUser.id
                    if (
                        cmsUser.divisionAssignment &&
                        isValidCmsDivison(cmsUser.divisionAssignment)
                    ) {
                        // The CMS user has a division — attribute the question to it.
                        division = cmsUser.divisionAssignment
                    } else if (
                        input.division &&
                        isValidCmsDivison(input.division)
                    ) {
                        // The CMS user has no division; fall back to the division
                        // the admin picked for them.
                        division = input.division
                    } else {
                        const msg =
                            'a division is required when the selected CMS user has no division assignment'
                        logResolverError(
                            'adminCreateContractQuestion',
                            msg,
                            context
                        )
                        throw createUserInputError(msg)
                    }
                } else {
                    if (!input.division || !isValidCmsDivison(input.division)) {
                        const msg =
                            'a division is required when no CMS user is selected'
                        logResolverError(
                            'adminCreateContractQuestion',
                            msg,
                            context
                        )
                        throw createUserInputError(msg)
                    }
                    division = input.division
                }

                // Keep the EQRO/DMCO data rule consistent with the CMS path.
                if (
                    contractResult.contractSubmissionType === 'EQRO' &&
                    division !== 'DMCO'
                ) {
                    const msg =
                        'EQRO contract questions can only be attributed to the DMCO division'
                    logResolverError(
                        'adminCreateContractQuestion',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                // Admin Q&A is a corrective tool, so questions are allowed on a
                // contract in any workflow status (including APPROVED). The one
                // invariant kept is that the contract must have a submitted
                // package to attach Q&A to — a never-submitted DRAFT has none.
                if (contractResult.revisions.length === 0) {
                    const errMessage = `Issue creating question for contract. Message: Cannot create question for contract in ${contractResult.consolidatedStatus} status`
                    logResolverError(
                        'adminCreateContractQuestion',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage)
                }

                // Parse and validate document s3URLs at the API boundary
                const questionDocs = parseAndValidateDocuments(
                    input.documents.map((d) => ({
                        name: d.name,
                        s3URL: d.s3URL,
                    }))
                )

                const inputFormatted: AdminCreateContractQuestionInput = {
                    contractID: input.contractID,
                    division,
                    addedByUserID,
                    createdByAdminID: user.id,
                    reason: input.reason,
                    createdAt: input.createdAt
                        ? new Date(input.createdAt)
                        : undefined,
                    documents: questionDocs,
                }

                const questionResult =
                    await store.insertAdminContractQuestion(inputFormatted)

                if (questionResult instanceof Error) {
                    const errMessage = `Issue creating admin question for package. Message: ${questionResult.message}`
                    logResolverError(
                        'adminCreateContractQuestion',
                        errMessage,
                        context
                    )
                    throw new Error(errMessage)
                }

                // No notification emails are sent for admin-created rounds.

                logResolverSuccess('adminCreateContractQuestion', context)

                return {
                    question: questionResult,
                }
            }
        )
    }
}

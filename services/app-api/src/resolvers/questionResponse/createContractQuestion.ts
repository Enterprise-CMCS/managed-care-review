import type { MutationResolvers } from '../../gen/gqlServer'
import { contractSubmitters, hasCMSPermissions } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { NotFoundError, type Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison } from '../../domain-models'
import type { Emailer } from '../../emailer'
import { oauthCanWrite } from '../../authorization/oauthAuthorization'
import type { StateCodeType } from '@mc-review/submissions'
import { parseAndValidateDocuments } from '../documentHelpers'

export function createContractQuestionResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createContractQuestion'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createContractQuestion', {}, ctx)

        // Check OAuth client read permissions
        if (!oauthCanWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('createContractQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!hasCMSPermissions(user)) {
            const msg = 'user not authorized to create a question'
            logError('createContractQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        if (
            !user.divisionAssignment ||
            (user.divisionAssignment &&
                !isValidCmsDivison(user.divisionAssignment))
        ) {
            const msg =
                'users without an assigned division are not authorized to create a question'
            logError('createContractQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question documents are required'
            logError('createContractQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(msg)
        }

        // Return error if package is not found or errors
        const contractResult = await store.findContractWithHistory(
            input.contractID
        )
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `Package with id ${input.contractID} does not exist`
                logError('createContractQuestion', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a package. Message: ${contractResult.message}`
            logError('createContractQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Return error if contract status is DRAFT, contract will have no submitted revisions
        // Return error if contract has been approved
        if (
            contractResult.revisions.length === 0 ||
            contractResult.consolidatedStatus === 'APPROVED'
        ) {
            const errMessage = `Issue creating question for contract. Message: Cannot create question for contract in ${contractResult.consolidatedStatus} status`
            logError('createContractQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }

        const statePrograms = store.findStatePrograms(contractResult.stateCode)
        const submitterEmails = contractSubmitters(contractResult)

        if (statePrograms instanceof Error) {
            logError('findStatePrograms', statePrograms.message)
            setErrorAttributesOnActiveSpan(statePrograms.message, span)
            throw new GraphQLError(statePrograms.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const allQuestions = await store.findAllQuestionsByContract(
            contractResult.id
        )
        if (allQuestions instanceof Error) {
            const errMessage = `Issue finding all questions associated with the contract: ${contractResult.id}`
            logError('createContractQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }
        // Parse and validate document s3URLs at API boundary
        const docs = parseAndValidateDocuments(
            input.documents.map((d) => ({
                name: d.name,
                s3URL: d.s3URL,
            }))
        )

        const inputFormatted = {
            ...input,
            documents: docs,
        }
        const questionResult = await store.insertContractQuestion(
            inputFormatted,
            user
        )

        if (questionResult instanceof Error) {
            const errMessage = `Issue creating question for package. Message: ${questionResult.message}`
            logError('createContractQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        allQuestions.push(questionResult)

        const sendQuestionsStateEmailResult =
            await emailer.sendQuestionsStateEmail(
                contractResult.revisions[0],
                contractResult.contractSubmissionType,
                submitterEmails,
                statePrograms,
                questionResult
            )

        if (sendQuestionsStateEmailResult instanceof Error) {
            logError(
                'sendQuestionsStateEmail - state email failed',
                sendQuestionsStateEmailResult
            )
            setErrorAttributesOnActiveSpan('state email failed', span)
            const errMessage = `Error sending a state email for 
                questionID: ${questionResult.id} and contractID: ${contractResult.id}`
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        let stateAnalystsEmails: string[] = []
        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            contractResult.stateCode as StateCodeType
        )

        if (stateAnalystsEmailsResult instanceof Error) {
            logError(
                'getStateAnalystsEmails',
                stateAnalystsEmailsResult.message
            )
            setErrorAttributesOnActiveSpan(
                stateAnalystsEmailsResult.message,
                span
            )
        } else {
            stateAnalystsEmails = stateAnalystsEmailsResult.map((u) => u.email)
        }

        const sendQuestionsCMSEmailResult = await emailer.sendQuestionsCMSEmail(
            contractResult.revisions[0],
            contractResult.contractSubmissionType,
            stateAnalystsEmails,
            statePrograms,
            allQuestions
        )

        if (sendQuestionsCMSEmailResult instanceof Error) {
            logError(
                'sendQuestionsCMSEmail - CMS email failed',
                sendQuestionsCMSEmailResult
            )
            setErrorAttributesOnActiveSpan('CMS email failed', span)
            const errMessage = `Error sending a CMS email for 
                questionID: ${questionResult.id} and contractID: ${contractResult.id}`
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }
        logSuccess('createContractQuestion')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: questionResult,
        }
    }
}

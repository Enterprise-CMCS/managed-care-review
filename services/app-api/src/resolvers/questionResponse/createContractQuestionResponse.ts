import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser, contractSubmitters } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { NotFoundError, type Store } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '@mc-review/submissions'
import { canWrite } from '../../authorization/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'

export function createContractQuestionResponseResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createContractQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan(
            'createContractQuestionResponse',
            {},
            ctx
        )

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('createContractQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!isStateUser(user)) {
            const msg = 'user not authorized to create a question response'
            logError('createContractQuestionResponse', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question response documents are required'
            logError('createContractQuestionResponse', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(msg)
        }
        // Parse and validate document s3URLs
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
        const createResponseResult = await store.insertContractQuestionResponse(
            inputFormatted,
            user
        )

        if (createResponseResult instanceof Error) {
            if (createResponseResult instanceof NotFoundError) {
                const errMessage = `Contract question with ID: ${input.questionID} not found to attach response to`
                logError('createContractQuestionResponse', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage)
            }

            const errMessage = `Issue creating question response for contract question ${input.questionID}. Message: ${createResponseResult.message}`
            logError('createContractQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const questions = await store.findAllQuestionsByContract(
            createResponseResult.contractID
        )
        if (questions instanceof Error) {
            const errMessage = `Issue finding all questions for contract with ID ${createResponseResult.contractID}. Message: ${questions.message}`
            logError('createContractQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const contract = await store.findContractWithHistory(
            createResponseResult.contractID
        )
        if (contract instanceof Error) {
            if (contract instanceof NotFoundError) {
                const errMessage = `Package with id ${createResponseResult.contractID} does not exist`
                logError('createContractQuestionResponse', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a package. Message: ${contract.message}`
            logError('createContractQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Return error if contract has been approved
        if (contract.consolidatedStatus === 'APPROVED') {
            const errMessage = `Issue creating response for contract. Message: Cannot create response for contract in ${contract.consolidatedStatus} status`
            logError('createContractQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }

        const statePrograms = store.findStatePrograms(contract.stateCode)
        if (statePrograms instanceof Error) {
            logError('createContractQuestionResponse', statePrograms.message)
            setErrorAttributesOnActiveSpan(statePrograms.message, span)
            throw new GraphQLError(statePrograms.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        const submitterEmails = contractSubmitters(contract)

        let stateAnalystsEmails: string[] = []
        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            contract.stateCode as StateCodeType
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

        const sendQuestionResponseCMSEmailResult =
            await emailer.sendQuestionResponseCMSEmail(
                contract.revisions[0],
                contract.contractSubmissionType,
                statePrograms,
                stateAnalystsEmails,
                createResponseResult,
                questions
            )

        if (sendQuestionResponseCMSEmailResult instanceof Error) {
            logError(
                'sendQuestionResponseCMSEmail - Send CMS email',
                sendQuestionResponseCMSEmailResult.message
            )
            setErrorAttributesOnActiveSpan(
                `Send CMS email failed: ${sendQuestionResponseCMSEmailResult.message}`,
                span
            )
            throw new GraphQLError('Email failed', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        const sendQuestionResponseStateEmailResult =
            await emailer.sendQuestionResponseStateEmail(
                contract.revisions[0],
                contract.contractSubmissionType,
                statePrograms,
                submitterEmails,
                createResponseResult,
                questions
            )

        if (sendQuestionResponseStateEmailResult instanceof Error) {
            logError(
                'sendQuestionResponseStateEmail - Send State email',
                sendQuestionResponseStateEmailResult.message
            )
            setErrorAttributesOnActiveSpan(
                `Send State email failed: ${sendQuestionResponseStateEmailResult.message}`,
                span
            )
            throw new GraphQLError('Email failed', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('createContractQuestionResponse')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: createResponseResult,
        }
    }
}

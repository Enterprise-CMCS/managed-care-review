import type { MutationResolvers } from '../../gen/gqlServer'
import { contractSubmitters, hasCMSPermissions } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison } from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { EmailParameterStore } from '../../parameterStore'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { StateCodeType } from '../../testHelpers'

export function createContractQuestionResolver(
    store: Store,
    emailParameterStore: EmailParameterStore,
    emailer: Emailer,
    launchDarkly: LDService
): MutationResolvers['createContractQuestion'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createContractQuestion', {}, ctx)

        const featureFlags = await launchDarkly.allFlags(context)
        const readStateAnalystsFromDBFlag =
            featureFlags?.['read-write-state-assignments']
        if (!hasCMSPermissions(user)) {
            const msg = 'user not authorized to create a question'
            logError('createContractQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
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
            throw new ForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question documents are required'
            logError('createContractQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg)
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

        // Return error if package status is DRAFT, contract will have no submitted revisions
        if (contractResult.revisions.length === 0) {
            const errMessage = `Issue creating question for health plan package. Message: Cannot create question for health plan package in DRAFT status`
            logError('createContractQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
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
        const docs = input.documents.map((doc) => {
            return {
                name: doc.name,
                s3URL: doc.s3URL,
            }
        })
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
        if (readStateAnalystsFromDBFlag) {
            // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
            const stateAnalystsEmailsResult =
                await store.findStateAssignedUsers(
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
                stateAnalystsEmails = stateAnalystsEmailsResult.map(
                    (u) => u.email
                )
            }
        } else {
            const stateAnalystsEmailsResult =
                await emailParameterStore.getStateAnalystsEmails(
                    contractResult.stateCode
                )

            //If error log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
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
                stateAnalystsEmails = stateAnalystsEmailsResult
            }
        }

        const sendQuestionsCMSEmailResult = await emailer.sendQuestionsCMSEmail(
            contractResult.revisions[0],
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

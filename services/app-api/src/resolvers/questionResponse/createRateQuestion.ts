import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { hasCMSPermissions, isValidCmsDivison } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'

export function createRateQuestionResolver(
    store: Store
): MutationResolvers['createRateQuestion'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createRateQuestion', {}, ctx)

        if (!hasCMSPermissions(user)) {
            const msg = 'user not authorized to create a question'
            logError('createRateQuestion', msg)
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
            logError('createRateQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question documents are required'
            logError('createRateQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg)
        }

        const rate = await store.findRateWithHistory(input.rateID)

        if (rate instanceof Error) {
            if (rate instanceof NotFoundError) {
                const errMessage = `Rate with id ${input.rateID} does not exist`
                logError('createRateQuestion', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a rate. Message: ${rate.message}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Draft rate will have no submitted revisions
        if (rate.status === 'DRAFT') {
            const errMessage = `Issue creating question for rate. Message: Cannot create question for rate in DRAFT status`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        const inputFormatted = {
            ...input,
            documents: input.documents.map((doc) => {
                return {
                    name: doc.name,
                    s3URL: doc.s3URL,
                }
            }),
        }

        const questionResult = await store.insertRateQuestion(
            inputFormatted,
            user
        )

        if (questionResult instanceof Error) {
            const errMessage = `Issue creating question for rate. Message: ${questionResult.message}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        logSuccess('createRateQuestion')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: questionResult,
        }
    }
}

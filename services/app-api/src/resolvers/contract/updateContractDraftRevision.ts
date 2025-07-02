import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStateUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql/index'
import { validateContractDraftRevisionInput } from '../../domain-models/contractAndRates'
import { canWrite } from '../../authorization/oauthAuthorization'

export function updateContractDraftRevision(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateContractDraftRevision'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('updateContractDraftRevision', {}, ctx)
        setResolverDetailsOnActiveSpan(
            'updateContractDraftRevision',
            user,
            span
        )

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('updateContractDraftRevision', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

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
            setErrorAttributesOnActiveSpan(errMessage, span)

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
            logError('updateContractDraftRevision', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        if (
            !contractWithHistory.draftRevision ||
            contractWithHistory.status === 'SUBMITTED' ||
            contractWithHistory.status === 'RESUBMITTED'
        ) {
            const errMessage = `Contract is not in editable state. Contract: ${contractID} Status: ${contractWithHistory.status}`
            logError('updateContractDraftRevision', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
            })
        }

        // If updatedAt does not match concurrent editing occurred.
        if (
            contractWithHistory.draftRevision.updatedAt.getTime() !==
            lastSeenUpdatedAt.getTime()
        ) {
            const errMessage = `Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.`
            logError('updateContractDraftRevision', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        // Using zod to validate and transform graphQL types into domain types.
        const parsedFormData = validateContractDraftRevisionInput(
            formData,
            contractWithHistory.stateCode,
            store,
            featureFlags
        )

        if (parsedFormData instanceof Error) {
            const errMessage = parsedFormData.message
            logError('updateContractDraftRevision', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        const editableFormData = parsedFormData

        // Update contract draft revision
        const updateResult = await store.updateDraftContract({
            contractID,
            formData: editableFormData,
        })

        if (updateResult instanceof Error) {
            const errMessage = `Error updating form data: ${contractID}:: ${updateResult.message}`
            logError('updateContractDraftRevision', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('updateContractDraftRevision')
        setSuccessAttributesOnActiveSpan(span)

        return {
            contract: updateResult,
        }
    }
}

import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { State } from '../../gen/gqlServer'
import { pluralize } from '@mc-review/common-code'
import type { InsertContractArgsType } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'

export function createContract(
    store: Store
): MutationResolvers['createContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createContract', {}, ctx)
        setResolverDetailsOnActiveSpan('createContract', user, span)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('createContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'createContract',
                'user not authorized to create state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to create state data',
                span
            )
            throw createForbiddenError(
                'user not authorized to create state data'
            )
        }

        const stateFromCurrentUser: State['code'] = user.stateCode

        const programs = store.findPrograms(
            stateFromCurrentUser,
            input.programIDs
        )

        if (programs instanceof Error) {
            const count = input.programIDs.length
            const errMessage = `The program ${pluralize(
                'id',
                count
            )} ${input.programIDs.join(', ')} ${pluralize(
                'does',
                count
            )} not exist in state ${stateFromCurrentUser}`
            logError('createContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(
                errMessage,
                'programIDs',
                input.programIDs
            )
        }

        const insertArgs: InsertContractArgsType = {
            contractSubmissionType: input.contractSubmissionType,
            stateCode: stateFromCurrentUser,
            populationCovered: input.populationCovered,
            programIDs: input.programIDs,
            riskBasedContract: input.riskBasedContract ?? undefined,
            submissionDescription: input.submissionDescription,
            submissionType: input.submissionType,
            contractType: input.contractType,
            managedCareEntities: input.managedCareEntities ?? undefined,
        }

        const contractResult = await store.insertDraftContract(insertArgs)
        if (contractResult instanceof Error) {
            const errMessage = `Error creating a draft contract. Message: ${contractResult.message}`
            logError('createContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('createContract')
        setSuccessAttributesOnActiveSpan(span)

        return {
            contract: contractResult,
        }
    }
}

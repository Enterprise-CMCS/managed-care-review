import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { State } from '../../gen/gqlServer'
import { pluralize } from '../../../../app-web/src/common-code/formatters'
import type { InsertContractArgsType } from '../../postgres'
import { GraphQLError } from 'graphql/index'

export function createContract(
    store: Store
): MutationResolvers['createContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createContract', {}, ctx)
        setResolverDetailsOnActiveSpan('createContract', user, span)

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
            throw new ForbiddenError('user not authorized to create state data')
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
            throw new UserInputError(errMessage, {
                argumentName: 'programIDs',
            })
        }

        const insertArgs: InsertContractArgsType = {
            stateCode: stateFromCurrentUser,
            populationCovered: input.populationCovered,
            programIDs: input.programIDs,
            riskBasedContract: input.riskBasedContract ?? undefined,
            submissionDescription: input.submissionDescription,
            submissionType: input.submissionType,
            contractType: input.contractType,
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

import type { MutationResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { isStateUser } from '../../domain-models'
import { rateFormDataSchema } from '../../domain-models/contractAndRates'
import { ForbiddenError, UserInputError } from 'apollo-server-core'
import { z } from 'zod'
import type { UpdateDraftContractRatesArgsType } from '../../postgres/contractAndRates/updateDraftContractRates'

// Zod schemas to parse the updatedRates param since the types are not fully defined in GQL
// CREATE / UPDATE / LINK
// CREATE: rateID: NO, formData YES
// UPDATE rateID: YES, formData YES,
// LINK: rateID: YES, formData: NO
const rateCreateSchema = z.object({
    type: z.literal('CREATE'),
    rateID: z.undefined(),
    formData: rateFormDataSchema,
})

const rateUpdateSchema = z.object({
    type: z.literal('UPDATE'),
    rateID: z.string(),
    formData: rateFormDataSchema,
})

const rateLinkSchema = z.object({
    type: z.literal('LINK'),
    rateID: z.string(),
    formData: z.undefined(),
})

const updatedRateUnion = z.discriminatedUnion('type', [
    rateCreateSchema,
    rateUpdateSchema,
    rateLinkSchema,
])

const updatedRatesSchema = z.array(updatedRateUnion)

function updateDraftContractRates(
    store: Store
): MutationResolvers['updateDraftContractRates'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateDraftContractRates', user, span)

        const { contractID, updatedRates } = input
        const parsedRatesResult = updatedRatesSchema.safeParse(updatedRates)

        if (!parsedRatesResult.success) {
            const errMsg = `updatedRates not correctly formatted: ${parsedRatesResult.error}`
            logError('updateDraftContractRates', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new UserInputError(errMsg)
        }

        const parsedUpdates = parsedRatesResult.data

        // fetch contract with rates
        const contract = await store.findContractWithHistory(contractID)
        if (contract instanceof Error) {
            if (contract instanceof NotFoundError) {
                const notFoundMsg = `contract with ID ${contractID} not found`
                console.info(notFoundMsg)
                throw new GraphQLError(notFoundMsg, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }
            const errMessage = `Issue finding a contract with history with id ${contractID}. Message: ${contract.message}`
            logError('updateDraftContractRates', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // AUTHORIZATION
        // Only callable by a state user from this state
        if (isStateUser(user)) {
            const stateFromCurrentUser = user.stateCode
            if (contract.stateCode !== stateFromCurrentUser) {
                logError(
                    'updateDraftContractRates',
                    'user not authorized to update a draft from a different state'
                )
                setErrorAttributesOnActiveSpan(
                    'user not authorized to update a draft from a different state',
                    span
                )
                throw new ForbiddenError(
                    'user not authorized to update a draft from a different state'
                )
            }
            // this is a valid state user
        } else {
            // any other user type is invalid
            logError(
                'updateDraftContractRates',
                'user not authorized to update a draft'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to update a draft',
                span
            )
            throw new ForbiddenError('user not authorized to update a draft')
        }
        // state user is authorized

        // Can only update a contract that is editable
        if (!(contract.status === 'DRAFT' || contract.status === 'UNLOCKED')) {
            const errMsg =
                'you cannot update a contract that is not DRAFT or UNLOCKED'
            logError('updateDraftContractRates', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new UserInputError(errMsg)
        }

        // The Request is Valid!
        // Deal with new rates, matching to old rates

        // Create gets passed through

        // Updated rates need to exist
        // linked rates need to be submitted
        // unlinked rates need to exist

        const rateUpdates: UpdateDraftContractRatesArgsType['rateUpdates'] = {
            create: [],
            update: [],
            link: [],
            unlink: [],
        }

        for (const rateUpdate of parsedUpdates) {
            if (rateUpdate.type === 'CREATE') {
                rateUpdates.create.push({ formData: rateUpdate.formData })
            }
        }

        const result = await store.updateDraftContractRates({
            contractID: contractID,
            rateUpdates: rateUpdates,
        })

        if (result instanceof Error) {
            throw result
        }
        // any omitted rates are deleted

        // return result.

        return { contract: result }
    }
}

export { updateDraftContractRates }

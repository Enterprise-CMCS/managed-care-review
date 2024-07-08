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
import { generateRateCertificationName } from '../rate/generateRateCertificationName'

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
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('updateDraftContractRates', {}, ctx)
        setResolverDetailsOnActiveSpan('updateDraftContractRates', user, span)

        const { contractID, updatedRates, lastSeenUpdatedAt } = input
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

        const statePrograms = store.findStatePrograms(contract.stateCode)
        if (statePrograms instanceof Error) {
            const errMessage = `Couldn't find programs for state ${contract.stateCode}. Message: ${statePrograms.message}`
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
        if (
            !contract.draftRevision ||
            !(contract.status === 'DRAFT' || contract.status === 'UNLOCKED')
        ) {
            const errMsg =
                'you cannot update a contract that is not DRAFT or UNLOCKED'
            logError('updateDraftContractRates', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new UserInputError(errMsg)
        }

        // If updatedAt does not match concurrent editing occurred.
        if (
            contract.draftRevision.updatedAt.getTime() !==
            lastSeenUpdatedAt.getTime()
        ) {
            const errMessage = `Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.`
            logError('updateDraftContractRates', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        // The Request is Valid!
        // Deal with new rates, matching to old rates
        const draftRates = contract.draftRates || []

        const rateUpdates: UpdateDraftContractRatesArgsType['rateUpdates'] = {
            create: [],
            update: [],
            link: [],
            unlink: [],
            delete: [],
        }

        // walk through the new rate list one by one
        // any rates that aren't in this list are unlinked (or deleted?)
        const knownRateIDs = draftRates.map((r) => r.id)
        let thisPosition = 1
        for (const rateUpdate of parsedUpdates) {
            if (rateUpdate.type === 'CREATE') {
                // set rateName for now https://jiraent.cms.gov/browse/MCR-4012
                const rateName = generateRateCertificationName(
                    rateUpdate.formData,
                    contract.stateCode,
                    statePrograms
                )

                rateUpdates.create.push({
                    formData: {
                        ...rateUpdate.formData,
                        rateCertificationName: rateName,
                    },
                    ratePosition: thisPosition,
                })
            }

            if (rateUpdate.type === 'UPDATE') {
                // rate must be in list of associated rates
                const knownRateIDX = knownRateIDs.indexOf(rateUpdate.rateID)
                if (knownRateIDX === -1) {
                    const errmsg =
                        'Attempted to update a rate not associated with this contract: ' +
                        rateUpdate.rateID
                    logError('updateDraftContractRates', errmsg)
                    setErrorAttributesOnActiveSpan(errmsg, span)
                    throw new UserInputError(errmsg)
                }
                knownRateIDs.splice(knownRateIDX, 1)

                // rate must be an editable child
                const rateToUpdate = draftRates.find(
                    (r) => r.id === rateUpdate.rateID
                )
                if (!rateToUpdate) {
                    const errmsg =
                        'Programming Error: this rate should exist, we had its ID: ' +
                        rateUpdate.rateID
                    logError('updateDraftContractRates', errmsg)
                    setErrorAttributesOnActiveSpan(errmsg, span)
                    throw new Error(errmsg)
                }

                if (
                    !(
                        rateToUpdate.status === 'DRAFT' ||
                        rateToUpdate.status === 'UNLOCKED'
                    )
                ) {
                    // eventually, this will be enough to cancel this. But until we have unlock-rate, you can edit UNLOCKED children of this contract.
                    const errmsg =
                        'Attempted to update a rate that is not editable: ' +
                        rateUpdate.rateID
                    logError('updateDraftContractRates', errmsg)
                    setErrorAttributesOnActiveSpan(errmsg, span)
                    throw new UserInputError(errmsg)
                }

                if (rateToUpdate.parentContractID !== contract.id) {
                    const errmsg =
                        'Attempted to update a rate that is not a child of this contract: ' +
                        rateUpdate.rateID
                    logError('updateDraftContractRates', errmsg)
                    setErrorAttributesOnActiveSpan(errmsg, span)
                    throw new UserInputError(errmsg)
                }

                // set rateName for now https://jiraent.cms.gov/browse/MCR-4012
                const rateName = generateRateCertificationName(
                    rateUpdate.formData,
                    contract.stateCode,
                    statePrograms
                )

                rateUpdates.update.push({
                    rateID: rateUpdate.rateID,
                    formData: {
                        ...rateUpdate.formData,
                        rateCertificationName: rateName,
                    },
                    ratePosition: thisPosition,
                })
            }

            if (rateUpdate.type === 'LINK') {
                const knownRateIDX = knownRateIDs.indexOf(rateUpdate.rateID)
                if (knownRateIDX !== -1) {
                    knownRateIDs.splice(knownRateIDX, 1)
                    // we still pass all links down to the db, position might have changed?
                    rateUpdates.link.push({
                        rateID: rateUpdate.rateID,
                        ratePosition: thisPosition,
                    })
                } else {
                    // linked rates must exist and not be DRAFT
                    const rateToLink = await store.findRateWithHistory(
                        rateUpdate.rateID
                    )
                    if (rateToLink instanceof Error) {
                        if (rateToLink instanceof NotFoundError) {
                            const errmsg =
                                'Attempting to link a rate that does not exist: ' +
                                rateUpdate.rateID
                            logError('updateDraftContractRates', errmsg)
                            setErrorAttributesOnActiveSpan(errmsg, span)
                            throw new UserInputError(errmsg)
                        }

                        const errmsg =
                            'Unexpected Error: couldnt fetch the linking rate: ' +
                            rateUpdate.rateID
                        logError('updateDraftContractRates', errmsg)
                        setErrorAttributesOnActiveSpan(errmsg, span)
                        throw new Error(errmsg)
                    }

                    if (rateToLink.status === 'DRAFT') {
                        const errmsg =
                            'Attempted to link a rate that has never been submitted: ' +
                            rateUpdate.rateID
                        logError('updateDraftContractRates', errmsg)
                        setErrorAttributesOnActiveSpan(errmsg, span)
                        throw new UserInputError(errmsg)
                    }

                    // this is a new link, actually link them.
                    rateUpdates.link.push({
                        rateID: rateUpdate.rateID,
                        ratePosition: thisPosition,
                    })
                }
            }

            thisPosition++
        }

        // we've gone through the existing rates, anything we didn't see we should remove
        for (const removedRateID of knownRateIDs) {
            const removedRate = draftRates.find((r) => r.id === removedRateID)

            if (!removedRate) {
                throw new Error(
                    'Programming Error this should be impossible, these IDs came from the draft rates'
                )
            }

            // if removedRate is a draft, mark for deletion
            if (removedRate.status === 'DRAFT') {
                rateUpdates.delete.push({ rateID: removedRateID })
            } else {
                // unlink all other omitted rates
                rateUpdates.unlink.push({ rateID: removedRateID })
            }
        }

        const result = await store.updateDraftContractRates({
            contractID: contractID,
            rateUpdates: rateUpdates,
        })

        if (result instanceof Error) {
            logError('updateDraftContractRates', result.message)
            setErrorAttributesOnActiveSpan(result.message, span)
            throw result
        }

        // return result.
        return { contract: result }
    }
}

export { updateDraftContractRates }

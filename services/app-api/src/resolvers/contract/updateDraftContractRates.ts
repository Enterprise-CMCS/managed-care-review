import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import { NotFoundError, handleNotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { isStateUser } from '../../domain-models'
import { rateFormDataSchema } from '../../domain-models/contractAndRates'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { z } from 'zod'
import type { UpdateDraftContractRatesArgsType } from '../../postgres/contractAndRates/updateDraftContractRates'
import { generateRateCertificationName } from '../rate/generateRateCertificationName'
import { canWrite } from '../../oauth/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'

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
        const { user } = context

        return withResolverSpan(
            context,
            'updateDraftContractRates',
            { 'mcreview.package_id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'updateDraftContractRates',
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

                const { contractID, updatedRates, lastSeenUpdatedAt } = input

                // Parse and validate documents for each rate that has formData
                const updatedRatesWithValidatedDocs = updatedRates.map(
                    (rateUpdate) => {
                        // Only CREATE and UPDATE operations have formData
                        if (
                            rateUpdate.type === 'LINK' ||
                            !rateUpdate.formData
                        ) {
                            return rateUpdate
                        }

                        const formData = rateUpdate.formData

                        // Validate documents if present
                        const validatedRateDocuments = formData.rateDocuments
                            ? parseAndValidateDocuments(
                                  formData.rateDocuments.map((d) => ({
                                      name: d.name,
                                      s3URL: d.s3URL,
                                      sha256: d.sha256,
                                  }))
                              )
                            : undefined

                        const validatedSupportingDocuments =
                            formData.supportingDocuments
                                ? parseAndValidateDocuments(
                                      formData.supportingDocuments.map((d) => ({
                                          name: d.name,
                                          s3URL: d.s3URL,
                                          sha256: d.sha256,
                                      }))
                                  )
                                : undefined

                        // Return rate update with validated documents
                        return {
                            ...rateUpdate,
                            formData: {
                                ...formData,
                                rateDocuments: validatedRateDocuments,
                                supportingDocuments:
                                    validatedSupportingDocuments,
                            },
                        }
                    }
                )

                const parsedRatesResult = updatedRatesSchema.safeParse(
                    updatedRatesWithValidatedDocs
                )

                if (!parsedRatesResult.success) {
                    const errMsg = `updatedRates not correctly formatted: ${parsedRatesResult.error}`
                    logResolverError(
                        'updateDraftContractRates',
                        errMsg,
                        context
                    )
                    throw createUserInputError(errMsg)
                }

                const parsedUpdates = parsedRatesResult.data
                // fetch contract with rates
                const contract = await store.findContractWithHistory(contractID)
                if (contract instanceof Error) {
                    if (contract instanceof NotFoundError) {
                        throw handleNotFoundError(contract)
                    }
                    const errMessage = `Issue finding a contract with history with id ${contractID}. Message: ${contract.message}`
                    logResolverError(
                        'updateDraftContractRates',
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

                const statePrograms = store.findStatePrograms(
                    contract.stateCode
                )
                if (statePrograms instanceof Error) {
                    const errMessage = `Couldn't find programs for state ${contract.stateCode}. Message: ${statePrograms.message}`
                    logResolverError(
                        'updateDraftContractRates',
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

                // AUTHORIZATION
                // Only callable by a state user from this state
                if (isStateUser(user)) {
                    const stateFromCurrentUser = user.stateCode
                    if (contract.stateCode !== stateFromCurrentUser) {
                        const errMessage =
                            'user not authorized to update a draft from a different state'
                        logResolverError(
                            'updateDraftContractRates',
                            errMessage,
                            context
                        )
                        throw createForbiddenError(errMessage)
                    }
                    // this is a valid state user
                } else {
                    // any other user type is invalid
                    const errMessage = 'user not authorized to update a draft'
                    logResolverError(
                        'updateDraftContractRates',
                        errMessage,
                        context
                    )
                    throw createForbiddenError(errMessage)
                }
                // state user is authorized

                const editableStatuses = ['DRAFT', 'UNLOCKED']

                // Can only update a contract that is editable
                if (
                    !contract.draftRevision ||
                    !editableStatuses.includes(contract.consolidatedStatus)
                ) {
                    const errMsg =
                        'you cannot update a contract that is not DRAFT or UNLOCKED'
                    logResolverError(
                        'updateDraftContractRates',
                        errMsg,
                        context
                    )
                    throw createUserInputError(errMsg)
                }

                // If updatedAt does not match concurrent editing occurred.
                if (
                    contract.draftRevision.updatedAt.getTime() !==
                    lastSeenUpdatedAt.getTime()
                ) {
                    const errMessage = `Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.`
                    logResolverError(
                        'updateDraftContractRates',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage)
                }

                // The Request is Valid!
                // Deal with new rates, matching to old rates
                const draftRates = contract.draftRates || []

                const rateUpdates: UpdateDraftContractRatesArgsType['rateUpdates'] =
                    {
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
                        const knownRateIDX = knownRateIDs.indexOf(
                            rateUpdate.rateID
                        )
                        if (knownRateIDX === -1) {
                            const errmsg =
                                'Attempted to update a rate not associated with this contract: ' +
                                rateUpdate.rateID
                            logResolverError(
                                'updateDraftContractRates',
                                errmsg,
                                context
                            )
                            throw createUserInputError(errmsg)
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
                            logResolverError(
                                'updateDraftContractRates',
                                errmsg,
                                context
                            )
                            throw createUserInputError(errmsg)
                        }

                        if (
                            !editableStatuses.includes(
                                rateToUpdate.consolidatedStatus
                            )
                        ) {
                            // eventually, this will be enough to cancel this. But until we have unlock-rate, you can edit UNLOCKED children of this contract.
                            const errmsg =
                                'Attempted to update a rate that is not editable: ' +
                                rateUpdate.rateID
                            logResolverError(
                                'updateDraftContractRates',
                                errmsg,
                                context
                            )
                            throw createUserInputError(errmsg)
                        }

                        if (rateToUpdate.parentContractID !== contract.id) {
                            const errmsg =
                                'Attempted to update a rate that is not a child of this contract: ' +
                                rateUpdate.rateID
                            logResolverError(
                                'updateDraftContractRates',
                                errmsg,
                                context
                            )
                            throw createUserInputError(errmsg)
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
                        const knownRateIDX = knownRateIDs.indexOf(
                            rateUpdate.rateID
                        )
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
                                    throw handleNotFoundError(rateToLink)
                                }

                                const errmsg =
                                    'Unexpected Error: couldnt fetch the linking rate: ' +
                                    rateUpdate.rateID
                                logResolverError(
                                    'updateDraftContractRates',
                                    errmsg,
                                    context
                                )
                                throw new GraphQLError(errmsg, {
                                    extensions: {
                                        code: 'INTERNAL_SERVER_ERROR',
                                        cause: 'DB_ERROR',
                                    },
                                })
                            }

                            if (
                                ['DRAFT', 'WITHDRAWN'].includes(
                                    rateToLink.consolidatedStatus
                                )
                            ) {
                                const errmsg = `Attempted to link a rate with an invalid status. Status: ${rateToLink.consolidatedStatus}. RateID: ${rateUpdate.rateID}`
                                logResolverError(
                                    'updateDraftContractRates',
                                    errmsg,
                                    context
                                )
                                throw createUserInputError(errmsg)
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
                    const removedRate = draftRates.find(
                        (r) => r.id === removedRateID
                    )

                    if (!removedRate) {
                        const errMsg = `Rates to be removed not found in associated rates to contract. RateID: ${removedRateID}`
                        logResolverError(
                            'updateDraftContractRates',
                            errMsg,
                            context
                        )
                        throw new GraphQLError(errMsg, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
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
                    const errMsg = `Failed to update draft contract rates. ${result.message}`
                    logResolverError(
                        'updateDraftContractRates',
                        errMsg,
                        context
                    )
                    throw new GraphQLError(errMsg, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('updateDraftContractRates', context)

                // return result.
                return { contract: result }
            }
        )
    }
}

export { updateDraftContractRates }

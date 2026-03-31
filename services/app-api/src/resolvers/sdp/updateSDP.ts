import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'
import {
    NotFoundError,
    UserInputPostgresError,
} from '../../postgres/postgresErrors'
import { parseAndValidateDocuments } from '../documentHelpers'

export function updateSDP(store: Store) {
    return async (_parent: unknown, { input }: any, context: any) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('updateSDP', {}, ctx)
        setResolverDetailsOnActiveSpan('updateSDP', user, span)

        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('updateSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!isStateUser(user)) {
            logError('updateSDP', 'user not authorized to update SDP data')
            setErrorAttributesOnActiveSpan(
                'user not authorized to update SDP data',
                span
            )
            throw createForbiddenError('user not authorized to update SDP data')
        }

        const stateFromCurrentUser = user.stateCode
        const uniqueRelatedContractIDs = [...new Set(input.relatedContractIDs)]

        const relatedContracts = await store.findAllContractsStripped({
            stateCode: stateFromCurrentUser,
            contractIDs: uniqueRelatedContractIDs,
            includeDrafts: true,
        })

        if (relatedContracts instanceof Error) {
            const errMessage = `Error validating related SDP contracts. Message: ${relatedContracts.message}`
            logError('updateSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const allContractsFound =
            relatedContracts.length === uniqueRelatedContractIDs.length &&
            relatedContracts.every(
                ({ contract }) => !(contract instanceof Error)
            )

        if (!allContractsFound) {
            const errMessage =
                'One or more selected contracts could not be linked to this SDP draft.'
            logError('updateSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(
                errMessage,
                'relatedContractIDs',
                uniqueRelatedContractIDs
            )
        }

        const validatedDocuments = parseAndValidateDocuments(
            input.sdpDocuments.map((document: any) => ({
                name: document.name,
                s3URL: document.s3URL,
                sha256: document.sha256,
            }))
        )

        const sdpResult = await store.updateDraftSDP({
            sdpID: input.sdpID,
            stateCode: stateFromCurrentUser,
            lastSeenUpdatedAt: input.lastSeenUpdatedAt,
            relatedContractIDs: uniqueRelatedContractIDs,
            sdpDocuments: validatedDocuments.map((document, index) => ({
                ...document,
                sha256: document.sha256!,
                dateAdded: input.sdpDocuments[index]?.dateAdded,
            })),
            stateContacts: input.stateContacts ?? [],
        })

        if (sdpResult instanceof NotFoundError) {
            const errMessage = `Error updating SDP draft. Message: ${sdpResult.message}`
            logError('updateSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (sdpResult instanceof UserInputPostgresError) {
            const errMessage = sdpResult.message
            logError('updateSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }

        if (sdpResult instanceof Error) {
            const errMessage = `Error updating SDP draft. Message: ${sdpResult.message}`
            logError('updateSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('updateSDP')
        setSuccessAttributesOnActiveSpan(span)

        return {
            sdp: sdpResult,
        }
    }
}

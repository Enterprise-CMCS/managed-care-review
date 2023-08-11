import { packageStatus, packageSubmittedAt } from '../../domain-models'
import { protoToBase64 } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import { convertToIndexQuestionsPayload } from '../../postgres/questionResponse'
import { logError } from '../../logger'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { GraphQLError } from 'graphql'

export function healthPlanPackageResolver(
    store: Store
): Resolvers['HealthPlanPackage'] {
    return {
        revisions(parent) {
            return parent.revisions.map((r) => {
                return {
                    node: {
                        id: r.id,
                        unlockInfo: r.unlockInfo,
                        submitInfo: r.submitInfo,
                        createdAt: r.createdAt,
                        formDataProto: protoToBase64(r.formDataProto),
                    },
                }
            })
        },
        status(parent) {
            const status = packageStatus(parent)
            if (status instanceof Error) {
                throw new GraphQLError(status.message, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'INVALID_PACKAGE_STATUS',
                    },
                })
            }
            return status
        },
        initiallySubmittedAt(parent) {
            return packageSubmittedAt(parent) || null
        },
        state(parent) {
            const packageState = parent.stateCode
            const state = statePrograms.states.find(
                (st) => st.code === packageState
            )

            if (state === undefined) {
                const errMessage =
                    'State not found in database: ' + packageState
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            return state
        },
        questions: async (parent, args, context) => {
            const { span } = context
            const pkgID = parent.id
            const result = await store.findAllQuestionsByHealthPlanPackage(
                pkgID
            )

            if (isStoreError(result)) {
                const errMessage = `Issue finding questions of type ${result.code} for package with id: ${pkgID}. Message: ${result.message}`
                logError('indexQuestions', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            return convertToIndexQuestionsPayload(result)
        },
    }
}

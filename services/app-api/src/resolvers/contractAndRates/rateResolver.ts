import { packageStatus, packageSubmittedAt } from '../../domain-models'
import statePrograms from 'app-web/src/common-code/data/statePrograms.json'
import type { Resolvers } from '../../gen/gqlServer'
import { GraphQLError } from 'graphql'
import type { RateType } from '../../domain-models/contractAndRates'

export const rateResolver: Resolvers['Rate'] =  {
        revisions(parent) {
            return parent.revisions?.map((r) => {
                const {id, unlockInfo, submitInfo, createdAt,updatedAt, rateType, rateCapitationType, rateDocuments, supportingDocuments, rateDateStart, rateDateEnd, rateDateCertified, amendmentEffectiveDateStart, amendmentEffectiveDateEnd, actuaryCommunicationPreference, rateProgramIDs, rateCertificationName, certifyingActuaryContacts, addtlActuaryContacts} = r.node
                return {
                    node: {
                        id,
                        unlockInfo,
                        submitInfo,
                        createdAt,
                        updatedAt,
                        rateType,
                        rateCapitationType,
                        rateDocuments,
                        supportingDocuments,
                        rateDateStart,
                        rateDateEnd,
                        rateDateCertified,
                        amendmentEffectiveDateStart,
                        amendmentEffectiveDateEnd,
                        rateProgramIDs,
                        rateCertificationName,
                        certifyingActuaryContacts,
                        addtlActuaryContacts,
                        actuaryCommunicationPreference
                    },
                }
            }) || []
        },
        status(parent) {
            const status = packageStatus(parent as unknown as RateType)
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
            return packageSubmittedAt(parent as unknown as RateType) || null
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
        }
}

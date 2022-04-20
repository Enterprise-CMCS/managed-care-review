import { packageStatus, packageSubmittedAt } from '../domain-models'
import { protoToBase64 } from '../../../app-web/src/common-code/proto/stateSubmission'
import { Resolvers } from '../gen/gqlServer'
import statePrograms from '../data/statePrograms.json'

export const healthPlanPackageResolver: Resolvers['HealthPlanPackage'] = {
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
            throw status
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
            throw new Error('State not found in database: ' + packageState)
        }
        return state
    },
}

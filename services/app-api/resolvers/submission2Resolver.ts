import { submissionStatus, submissionSubmittedAt } from '../../app-web/src/common-code/domain-models'
import { protoToBase64 } from '../../app-web/src/common-code/proto/stateSubmission'
import { Resolvers } from '../gen/gqlServer'


export const submission2Resolver: Resolvers['Submission2'] = {
    revisions(parent) {
        return parent.revisions.map(r => {
            return {
                revision: {
                    id: r.id,
                    unlockInfo: r.unlockInfo,
                    submitInfo: r.submitInfo,
                    submissionData: protoToBase64(r.submissionFormProto)
                }
            }
        })
    },
    status(parent) {
        const status = submissionStatus(parent)
        if (status instanceof Error) {
            throw status
        }
        return status
    },
    intiallySubmittedAt(parent) {
        return submissionSubmittedAt(parent) || null
    }
}

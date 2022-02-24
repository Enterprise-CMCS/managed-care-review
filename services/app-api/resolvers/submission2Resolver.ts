import { submissionStatus, submissionSubmittedAt } from '../../app-web/src/common-code/domain-models'
import { Resolvers } from '../gen/gqlServer'


export const submission2Resolver: Resolvers['Submission2'] = {
    revisions(parent) {
        return parent.revisions.map(r => {
            return {
                revision: {
                    id: r.id,
                    unlockInfo: r.unlockInfo,
                    submitInfo: r.submitInfo,
                    submissionData: Buffer.from(r.submissionFormProto).toString('base64')
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
    submittedAt(parent) {
        return submissionSubmittedAt(parent) || null
    }
}

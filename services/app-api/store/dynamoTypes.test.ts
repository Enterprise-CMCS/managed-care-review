import {
    convertToDomainSubmission,
    isNodeError,
    SubmissionStoreType,
} from './dynamoTypes'
import {
    isDraftSubmission,
    isStateSubmission,
} from '../../app-web/src/common-code/domain-models'

describe('dynamo Types', () => {
    it('converts the db type to DraftSubmissionType correctly', async () => {
        const storeSub = new SubmissionStoreType()
        storeSub.submissionDescription = 'a store draft submission'
        storeSub.status = 'DRAFT'
        storeSub.submittedAt = undefined
        storeSub.rateDocuments = [{ s3URL: 'foo.com', name: 'foo' }]
        const domainSubResult = convertToDomainSubmission(storeSub)

        expect(isDraftSubmission(domainSubResult)).toBeTruthy()
    })

    it('converts the db type to StateSubmissionType correctly', async () => {
        const storeSub = new SubmissionStoreType()
        storeSub.submissionDescription = 'a store draft submission'
        storeSub.status = 'SUBMITTED'
        storeSub.submittedAt = new Date()
        storeSub.contractType = 'BASE'
        storeSub.contractDateStart = new Date()
        storeSub.contractDateEnd = new Date()
        storeSub.documents = [{ s3URL: 'foo.com', name: 'foo' }]
        storeSub.rateDocuments = [{ s3URL: 'bar.com', name: 'bar' }]
        storeSub.federalAuthorities = ['WAIVER_1915B']
        storeSub.managedCareEntities = ['bar']

        const domainSubResult = convertToDomainSubmission(storeSub)

        expect(isStateSubmission(domainSubResult)).toBeTruthy()
    })

    it('errors converting to the db type to StateSubmissionType on no array', async () => {
        const storeSub = new SubmissionStoreType()
        storeSub.submissionDescription = 'a store draft submission'
        storeSub.status = 'SUBMITTED'
        storeSub.submittedAt = new Date()
        storeSub.contractType = 'BASE'
        storeSub.contractDateStart = new Date()
        storeSub.contractDateEnd = new Date()

        const domainSubResult = convertToDomainSubmission(storeSub)

        expect(isNodeError(domainSubResult)).toBeTruthy()
    })
})

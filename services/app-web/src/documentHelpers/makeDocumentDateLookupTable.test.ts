import { makeDateTable } from './makeDocumentDateLookupTable'
import { mockSubmittedHealthPlanPackageWithRevision } from '../testHelpers/apolloHelpers'
import {
    basicHealthPlanFormData,
    basicLockedHealthPlanFormData,
} from '../common-code/healthPlanFormDataMocks'
import { SubmissionDocument } from '../common-code/healthPlanFormDataType'
import { domainToBase64 } from '../common-code/proto/healthPlanFormDataProto'

describe('makeDateTable', () => {
    it('should make a proper lookup table', () => {
        const submissions = mockSubmittedHealthPlanPackageWithRevision()
        const lookupTable = makeDateTable(submissions)

        expect(lookupTable).toEqual({
            '529-10-0020-00003_Superior_Health Plan, Inc.pdf': new Date(
                '2022-03-25T21:13:20.420Z'
            ),
            'Amerigroup Texas Inc copy.pdf': new Date(
                '2022-03-25T21:13:20.420Z'
            ),
            'Amerigroup Texas, Inc.pdf': new Date('2022-03-25T21:13:20.420Z'),
            'covid-ifc-2-flu-rsv-codes 5-5-2021.pdf': new Date(
                '2022-03-25T21:14:43.057Z'
            ),
            'lifeofgalileo.pdf': new Date('2022-03-28T17:56:32.953Z'),
            previousSubmissionDate: new Date('2022-03-25T21:14:43.057Z'),
        })
    })
    it('should use earliest document added date', () => {
        const submissions = mockSubmittedHealthPlanPackageWithRevision()
        const docs: SubmissionDocument[] = [
            {
                s3URL: 's3://bucketname/testDateDoc/testDateDoc.png',
                name: 'Test Date Doc',
                documentCategories: ['CONTRACT_RELATED'],
            },
        ]
        const baseFormData = basicLockedHealthPlanFormData()
        baseFormData.documents = docs

        const unlockedData = basicHealthPlanFormData()
        unlockedData.documents = docs

        baseFormData.updatedAt = new Date('2022-01-10T00:00:00.000Z')
        const initialSubmission = domainToBase64(baseFormData)

        baseFormData.updatedAt = new Date('2022-02-10T00:00:00.000Z')
        const secondSubmission = domainToBase64(baseFormData)

        baseFormData.updatedAt = new Date('2022-03-10T00:00:00.000Z')
        const currentSubmission = domainToBase64(baseFormData)

        submissions.revisions[2].node.formDataProto = initialSubmission
        submissions.revisions[1].node.formDataProto = secondSubmission
        submissions.revisions[0].node.formDataProto = currentSubmission

        const lookupTable = makeDateTable(submissions)

        expect(lookupTable).toEqual({
            'contract doc': new Date('2022-01-10T00:00:00.000Z'),
            'Test Date Doc': new Date('2022-01-10T00:00:00.000Z'),
            previousSubmissionDate: new Date('2022-02-10T00:00:00.000Z'),
        })
    })
})

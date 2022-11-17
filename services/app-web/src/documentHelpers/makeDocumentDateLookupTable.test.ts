import { makeDateTable } from './makeDocumentDateLookupTable'
import { mockSubmittedHealthPlanPackageWithRevision } from '../testHelpers/apolloHelpers'
import { UnlockedHealthPlanFormDataType } from '../common-code/healthPlanFormDataType'

describe('makeDateTable', () => {
    it('should make a proper lookup table', () => {
        const submissions = mockSubmittedHealthPlanPackageWithRevision({
            currentSubmissionData: {
                updatedAt: new Date('2022-03-28T17:56:32.953Z'),
            },
            previousSubmissionData: {
                updatedAt: new Date('2022-03-25T21:14:43.057Z'),
            },
            initialSubmissionData: {
                updatedAt: new Date('2022-03-25T21:13:20.420Z'),
            },
        })
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
                '2022-03-25T21:13:20.420Z'
            ),
            'lifeofgalileo.pdf': new Date('2022-03-28T17:56:32.953Z'),
            previousSubmissionDate: new Date('2022-03-25T21:14:43.057Z'),
        })
    })
    it('should use earliest document added date', () => {
        const docs: Partial<UnlockedHealthPlanFormDataType> = {
            documents: [
                {
                    s3URL: 's3://bucketname/testDateDoc/testDateDoc.png',
                    name: 'Test Date Doc',
                    documentCategories: ['CONTRACT_RELATED'],
                },
            ],
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/foo.png',
                    name: 'contract doc',
                    documentCategories: ['CONTRACT'],
                },
            ],
            rateInfos: [
                {
                    rateDocuments: [],
                    actuaryContacts: [],
                    packagesWithSharedRateCerts: [],
                },
            ],
        }
        const submissions = mockSubmittedHealthPlanPackageWithRevision({
            currentSubmissionData: {
                ...docs,
                updatedAt: new Date('2022-03-10T00:00:00.000Z'),
            },
            previousSubmissionData: {
                ...docs,
                updatedAt: new Date('2022-02-10T00:00:00.000Z'),
            },
            initialSubmissionData: {
                ...docs,
                updatedAt: new Date('2022-01-10T00:00:00.000Z'),
            },
        })

        const lookupTable = makeDateTable(submissions)

        expect(lookupTable).toEqual({
            'contract doc': new Date('2022-01-10T00:00:00.000Z'),
            'Test Date Doc': new Date('2022-01-10T00:00:00.000Z'),
            previousSubmissionDate: new Date('2022-02-10T00:00:00.000Z'),
        })
    })
})

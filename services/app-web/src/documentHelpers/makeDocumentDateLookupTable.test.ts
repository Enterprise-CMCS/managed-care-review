import { makeDateTable } from './makeDocumentDateLookupTable'
import { mockSubmittedHealthPlanPackageWithRevision } from '../testHelpers/apolloMocks'
import { UnlockedHealthPlanFormDataType } from '@managed-care-review/common-code/healthPlanFormDataType'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextDecoder, TextEncoder })

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

        expect(JSON.stringify(lookupTable)).toEqual(
            JSON.stringify({
                's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf':
                    '2022-03-25T21:13:20.420Z',
                's3://bucketname/1648490162641-lifeofgalileo.pdf/lifeofgalileo.pdf':
                    '2022-03-28T17:56:32.953Z',
                's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf':
                    '2022-03-25T21:13:20.420Z',
                's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf':
                    '2022-03-25T21:13:20.420Z',
                's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf':
                    '2022-03-25T21:13:20.420Z',
                's3://bucketname/1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf/covid-ifc-2-flu-rsv-codes 5-5-2021.pdf':
                    '2022-03-25T21:13:20.420Z',
                previousSubmissionDate: '2022-03-25T21:14:43.057Z',
            })
        )
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
            's3://bucketname/key/foo.png': new Date('2022-01-10T00:00:00.000Z'),
            's3://bucketname/testDateDoc/testDateDoc.png': new Date(
                '2022-01-10T00:00:00.000Z'
            ),
            previousSubmissionDate: new Date('2022-02-10T00:00:00.000Z'),
        })
    })
})

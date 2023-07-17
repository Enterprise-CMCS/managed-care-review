import { makeDocumentDateTable } from './makeDocumentDateLookupTable'
import {
    mockDraftHealthPlanPackage,
    mockSubmittedHealthPlanPackageWithRevision,
} from '../testHelpers/apolloMocks'
import { UnlockedHealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { TextEncoder, TextDecoder } from 'util'
import { buildRevisionsLookup } from '../gqlHelpers/fetchHealthPlanPackageWrapper'

Object.assign(global, { TextDecoder, TextEncoder })

describe('makeDocumentDateTable', () => {
    it('should make a proper lookup table', () => {
        const submission = mockSubmittedHealthPlanPackageWithRevision({
            currentSubmitInfo: {
                updatedAt: new Date('2022-03-28T17:56:32.953Z'),
            },
            previousSubmitInfo: {
                updatedAt: new Date('2022-03-25T21:14:43.057Z'),
            },
            initialSubmitInfo: {
                updatedAt: new Date('2022-03-25T21:13:20.420Z'),
            },
        })
        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentDateTable(revisionsLookup)
        expect(lookupTable).toEqual({
            's3://bucketname/1648242632157-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf':
                new Date('2022-03-25T21:13:20.420Z'),
            's3://bucketname/1648490162641-lifeofgalileo.pdf/lifeofgalileo.pdf':
                new Date('2022-03-28T17:56:32.953Z'),
            's3://bucketname/1648242665634-Amerigroup Texas, Inc.pdf/Amerigroup Texas, Inc.pdf':
                new Date('2022-03-25T21:13:20.420Z'),
            's3://bucketname/1648242711421-Amerigroup Texas Inc copy.pdf/Amerigroup Texas Inc copy.pdf':
                new Date('2022-03-25T21:13:20.420Z'),
            's3://bucketname/1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf/529-10-0020-00003_Superior_Health Plan, Inc.pdf':
                new Date('2022-03-25T21:13:20.420Z'),
            's3://bucketname/1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf/covid-ifc-2-flu-rsv-codes 5-5-2021.pdf':
                new Date('2022-03-25T21:13:20.420Z'),
            previousSubmissionDate: new Date('2022-03-25T21:14:43.057Z'),
        })
    })

    it('should return no document dates for submission still in initial draft', () => {
        const submission = mockDraftHealthPlanPackage()
        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentDateTable(revisionsLookup)

        expect(lookupTable).toEqual({})
    })

    it('should use earliest document added date based that revisions submit date', () => {
        const docs: Partial<UnlockedHealthPlanFormDataType> = {
            documents: [
                {
                    s3URL: 's3://bucketname/testDateDoc/testDateDoc.pdf',
                    name: 'Test Date Doc',
                    documentCategories: ['CONTRACT_RELATED'],
                },
            ],
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/replaced-contract.pdf',
                    name: 'replaced contract',
                    documentCategories: ['CONTRACT'],
                },
            ],
            rateInfos: [
                {
                    rateDocuments: [],
                    supportingDocuments: [],
                    actuaryContacts: [],
                    packagesWithSharedRateCerts: [],
                },
            ],
        }
        const submission = mockSubmittedHealthPlanPackageWithRevision({
            currentSubmissionData: {
                ...docs,
            },
            currentSubmitInfo: {
                updatedAt: new Date('2022-03-10T00:00:00.000Z'),
            },
            previousSubmissionData: {
                ...docs,
            },
            previousSubmitInfo: {
                updatedAt: new Date('2022-02-10T00:00:00.000Z'),
            },
            initialSubmissionData: {
                ...docs,
                contractDocuments: [
                    {
                        s3URL: 's3://bucketname/key/original-contract.pdf',
                        name: 'original contract',
                        documentCategories: ['CONTRACT'],
                    },
                ],
            },
            initialSubmitInfo: {
                updatedAt: new Date('2022-01-10T00:00:00.000Z'),
            },
        })

        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentDateTable(revisionsLookup)

        expect(lookupTable).toEqual({
            's3://bucketname/key/original-contract.pdf': new Date(
                '2022-01-10T00:00:00.000Z'
            ),
            's3://bucketname/key/replaced-contract.pdf': new Date(
                '2022-02-10T00:00:00.000Z'
            ),
            's3://bucketname/testDateDoc/testDateDoc.pdf': new Date(
                '2022-01-10T00:00:00.00'
            ),
            previousSubmissionDate: new Date('2022-02-10T00:00:00.000Z'),
        })
    })
})

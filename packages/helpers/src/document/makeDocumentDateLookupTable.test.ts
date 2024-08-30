import { makeDocumentDateTable } from './makeDocumentDateLookupTable'
import {
    mockDraftHealthPlanPackage,
    mockSubmittedHealthPlanPackageWithRevision,
} from '@mc-review/mocks'
import { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import { TextEncoder, TextDecoder } from 'util'
import { buildRevisionsLookup } from '../gql'

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
            fakesha: new Date('2022-03-25T21:13:20.420Z'),
            fakesha1: new Date('2022-03-28T17:56:32.953Z'),
            fakesha2: new Date('2022-03-25T21:13:20.420Z'),
            fakesha3: new Date('2022-03-25T21:13:20.420Z'),
            fakesha4: new Date('2022-03-25T21:13:20.420Z'),
            fakesha5: new Date('2022-03-25T21:13:20.420Z'),
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

        expect(lookupTable).toEqual({
            previousSubmissionDate: null,
        })
    })

    it('should use earliest document added date based that revisions submit date', () => {
        const docs: Partial<UnlockedHealthPlanFormDataType> = {
            documents: [
                {
                    s3URL: 's3://bucketname/testDateDoc/testDateDoc.pdf',
                    name: 'Test Date Doc',
                    sha256: 'fakesha',
                },
            ],
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/replaced-contract.pdf',
                    name: 'replaced contract',
                    sha256: 'fakesha1',
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
                        sha256: 'fakesha2',
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
            fakesha: new Date('2022-01-10T00:00:00.000Z'),
            fakesha1: new Date('2022-02-10T00:00:00.000Z'),
            fakesha2: new Date('2022-01-10T00:00:00.00'),
            previousSubmissionDate: new Date('2022-02-10T00:00:00.000Z'),
        })
    })
})

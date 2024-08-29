import { makeDocumentS3KeyLookup } from './makeDocumentKeyLookupList'
import { mockSubmittedHealthPlanPackageWithRevision } from '../testHelpers/apolloMocks'
import { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import { buildRevisionsLookup } from '../gql'

describe('makeDocumentS3KeyLookup', () => {
    const noSubmissionDocuments: Partial<UnlockedHealthPlanFormDataType> = {
        contractDocuments: [],
        rateInfos: [
            {
                rateDocuments: [],
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
                supportingDocuments: [],
            },
        ],
        documents: [],
    }

    it('should make two lists with document s3 keys', () => {
        const submission = mockSubmittedHealthPlanPackageWithRevision({})
        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentS3KeyLookup(revisionsLookup)
        expect(lookupTable.currentDocuments.sort()).toEqual(
            [
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648490162641-lifeofgalileo.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                '1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
            ].sort()
        )

        expect(lookupTable.previousDocuments.sort()).toEqual(
            [
                '1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
            ].sort()
        )
    })

    it('should return empty arrays for no documents in submission', () => {
        const submission = mockSubmittedHealthPlanPackageWithRevision({
            currentSubmissionData: noSubmissionDocuments,
            previousSubmissionData: noSubmissionDocuments,
            initialSubmissionData: noSubmissionDocuments,
        })
        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentS3KeyLookup(revisionsLookup)

        expect(lookupTable).toEqual({
            currentDocuments: [],
            previousDocuments: [],
        })
    })

    it('should return empty array for currentDocuments when none exist', () => {
        const submission = mockSubmittedHealthPlanPackageWithRevision({
            currentSubmissionData: noSubmissionDocuments,
        })
        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentS3KeyLookup(revisionsLookup)

        expect(lookupTable.currentDocuments).toEqual([])
        expect(lookupTable.previousDocuments.sort()).toEqual(
            [
                '1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
            ].sort()
        )
    })

    it('should return empty array for previousDocuments when none exist', () => {
        const submission = mockSubmittedHealthPlanPackageWithRevision({
            previousSubmissionData: noSubmissionDocuments,
            initialSubmissionData: noSubmissionDocuments,
        })

        const revisionsLookup = buildRevisionsLookup(submission)
        if (revisionsLookup instanceof Error) {
            throw revisionsLookup
        }
        const lookupTable = makeDocumentS3KeyLookup(revisionsLookup)

        expect(lookupTable.previousDocuments).toEqual([])
        expect(lookupTable.currentDocuments.sort()).toEqual(
            [
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648490162641-lifeofgalileo.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                '1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
            ].sort()
        )
    })
})

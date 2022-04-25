import { makeDocumentList } from './makeDocumentKeyLookupList'
import {
    mockSubmittedHealthPlanPackage,
    mockSubmittedHealthPlanPackageWithRevision,
} from '../testHelpers/apolloHelpers'

describe('makeDocumentList', () => {
    it('should make two lists with document s3 keys', () => {
        const submissions = mockSubmittedHealthPlanPackageWithRevision()
        const lookupTable = makeDocumentList(submissions)

        expect(lookupTable).toEqual({
            currentDocuments: [
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648490162641-lifeofgalileo.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                '1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
            ],
            previousDocuments: [
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
                '1648242873229-covid-ifc-2-flu-rsv-codes 5-5-2021.pdf',
                '1648242632157-Amerigroup Texas, Inc.pdf',
                '1648242665634-Amerigroup Texas, Inc.pdf',
                '1648242711421-Amerigroup Texas Inc copy.pdf',
                '1648242711421-529-10-0020-00003_Superior_Health Plan, Inc.pdf',
            ],
        })
    })

    it('should return empty arrays for no documents in submission', () => {
        const submissions = mockSubmittedHealthPlanPackage()
        const lookupTable = makeDocumentList(submissions)

        expect(lookupTable).toEqual({
            currentDocuments: [],
            previousDocuments: [],
        })
    })

    it('should return error if any revisions does not decode', () => {
        const submissions = mockSubmittedHealthPlanPackage()
        const lookupTable = makeDocumentList(submissions)

        expect(lookupTable).toEqual({
            currentDocuments: [],
            previousDocuments: [],
        })
    })
})

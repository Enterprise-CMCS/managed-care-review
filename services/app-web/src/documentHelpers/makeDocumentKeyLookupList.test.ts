import { makeDocumentList } from './makeDocumentKeyLookupList'
import {
    mockSubmittedHealthPlanPackageWithRevision,
    mockUnlockedHealthPlanPackage,
} from '../testHelpers/apolloHelpers'
import {
    basicHealthPlanFormData,
    unlockedWithContacts,
} from '../common-code/domain-mocks'
import { domainToBase64 } from '../common-code/proto/stateSubmission'

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
        const baseFormData = basicHealthPlanFormData()
        const unlockedFormData = unlockedWithContacts()

        const submissions = mockUnlockedHealthPlanPackage()
        submissions.revisions[2].node.formDataProto =
            domainToBase64(baseFormData)
        submissions.revisions[1].node.formDataProto =
            domainToBase64(baseFormData)
        submissions.revisions[0].node.formDataProto =
            domainToBase64(unlockedFormData)

        const lookupTable = makeDocumentList(submissions)

        expect(lookupTable).toEqual({
            currentDocuments: [],
            previousDocuments: [],
        })
    })

    it('should return empty array for currentDocuments', () => {
        const unlockedFormData = unlockedWithContacts()

        const submissions = mockSubmittedHealthPlanPackageWithRevision()
        submissions.revisions[0].node.formDataProto =
            domainToBase64(unlockedFormData)

        const lookupTable = makeDocumentList(submissions)

        expect(lookupTable).toEqual({
            currentDocuments: [],
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

    it('should return empty array for previousDocuments', () => {
        const baseFormData = basicHealthPlanFormData()

        const submissions = mockSubmittedHealthPlanPackageWithRevision()
        submissions.revisions[2].node.formDataProto =
            domainToBase64(baseFormData)
        submissions.revisions[1].node.formDataProto =
            domainToBase64(baseFormData)

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
            previousDocuments: [],
        })
    })

    it('should return error if any revisions does not decode', () => {
        const submissions = mockSubmittedHealthPlanPackageWithRevision()
        submissions.revisions[1].node.formDataProto = 'Should return an error'
        const lookupTable = makeDocumentList(submissions)

        expect(lookupTable).toEqual(
            new Error(
                'Failed to read submission data; unable to display documents'
            )
        )
    })
})

import type { RateFormDataInput } from '../gen/gqlClient'
import type { UploadedDocument } from '../client/uploadClient'

const toDocumentInput = (document: UploadedDocument) => ({
    name: document.name,
    s3URL: document.s3URL,
    sha256: document.sha256,
})
/**
 * Builds one complete, valid rate revision for API-created synthetic packages.
 * Scenario-specific topology belongs in the caller; this builder owns only rate form data.
 */
export function buildSyntheticRateFormData(
    programId: string,
    rateDocument: UploadedDocument
): RateFormDataInput {
    return {
        rateType: 'NEW',
        rateCapitationType: 'RATE_CELL',
        rateMedicaidPopulations: [],
        rateDocuments: [toDocumentInput(rateDocument)],
        supportingDocuments: [],
        rateDateStart: '2026-01-01',
        rateDateEnd: '2026-12-31',
        rateDateCertified: '2025-12-15',
        deprecatedRateProgramIDs: [],
        rateProgramIDs: [programId],
        certifyingActuaryContacts: [
            {
                givenName: 'Synthetic',
                familyName: 'Actuary',
                titleRole: 'Synthetic test data',
                email: 'synthetic.actuary@example.com',
                actuarialFirm: 'MERCER',
                actuarialFirmOther: '',
            },
        ],
        addtlActuaryContacts: [],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
    }
}

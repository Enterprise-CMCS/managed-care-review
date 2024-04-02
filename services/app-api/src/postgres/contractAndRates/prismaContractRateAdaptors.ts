import type { RateFormEditableType } from '../../domain-models/contractAndRates'
import { formatDocsForPrisma } from '../../domain-models/documents'
import { emptify, nullify } from '../prismaDomainAdaptors'

// const  prismaRateSubmitFormDataFromDomain = (rateFormData: RateFormEditableType)=>{

// }

function prismaRateCreateFormDataFromDomain(
    rateFormData: RateFormEditableType
) {
    return {
        rateType: rateFormData.rateType,
        rateCapitationType: rateFormData.rateCapitationType,
        rateDateStart: rateFormData.rateDateStart,
        rateDateEnd: rateFormData.rateDateEnd,
        rateDateCertified: rateFormData.rateDateCertified,
        amendmentEffectiveDateStart: rateFormData.amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd: rateFormData.amendmentEffectiveDateEnd,
        rateProgramIDs: rateFormData.rateProgramIDs,
        rateCertificationName: rateFormData.rateCertificationName,
        rateDocuments: {
            create:
                rateFormData.rateDocuments &&
                formatDocsForPrisma(rateFormData.rateDocuments),
        },
        supportingDocuments: {
            create:
                rateFormData.supportingDocuments &&
                formatDocsForPrisma(rateFormData.supportingDocuments),
        },
        certifyingActuaryContacts: {
            create:
                rateFormData.certifyingActuaryContacts &&
                rateFormData.certifyingActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        addtlActuaryContacts: {
            create:
                rateFormData.addtlActuaryContacts &&
                rateFormData.addtlActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
    }
}

function prismaUpdateRateFormDataFromDomain(
    rateFormData: RateFormEditableType
) {
    return {
        rateType: nullify(rateFormData.rateType),
        rateCapitationType: nullify(rateFormData.rateCapitationType),
        rateDateStart: nullify(rateFormData.rateDateStart),
        rateDateEnd: nullify(rateFormData.rateDateEnd),
        rateDateCertified: nullify(rateFormData.rateDateCertified),
        amendmentEffectiveDateStart: nullify(
            rateFormData.amendmentEffectiveDateStart
        ),
        amendmentEffectiveDateEnd: nullify(
            rateFormData.amendmentEffectiveDateEnd
        ),
        rateProgramIDs: emptify(rateFormData.rateProgramIDs),
        rateCertificationName: nullify(rateFormData.rateCertificationName),
        rateDocuments: {
            deleteMany: {},
            create:
                rateFormData.rateDocuments &&
                formatDocsForPrisma(rateFormData.rateDocuments),
        },
        supportingDocuments: {
            deleteMany: {},
            create:
                rateFormData.supportingDocuments &&
                formatDocsForPrisma(rateFormData.supportingDocuments),
        },
        certifyingActuaryContacts: {
            deleteMany: {},
            create:
                rateFormData.certifyingActuaryContacts &&
                rateFormData.certifyingActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        addtlActuaryContacts: {
            deleteMany: {},
            create:
                rateFormData.addtlActuaryContacts &&
                rateFormData.addtlActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
    }
}

export {
    prismaRateCreateFormDataFromDomain,
    prismaUpdateRateFormDataFromDomain,
}

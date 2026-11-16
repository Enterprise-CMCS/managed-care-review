import type { ContractDraftRevisionFormDataInput } from '../gen/gqlServer'
import type { ContractFormDataType } from '../domain-models'
import { must } from './assertionHelpers'
import { findStatePrograms } from '../postgres'
import { defaultFloridaProgram } from './gqlHelpers'
// This mock is used for Graphql Input types
const mockGqlContractDraftRevisionFormDataInput = (
    stateCode?: string,
    formDataInput?: Partial<ContractDraftRevisionFormDataInput>
): ContractDraftRevisionFormDataInput => {
    // Tests often spread fetched form data into this mock. ilosExternalRates is output-only:
    // external rates are managed through updateDraftContractRates so they share one position
    // sequence with linked rates, so drop it here rather than at every call site.
    const gqlFormDataInput: Partial<ContractDraftRevisionFormDataInput> &
        Partial<Pick<ContractFormDataType, 'ilosExternalRates'>> = {
        ...formDataInput,
    }
    delete gqlFormDataInput.ilosExternalRates

    formDataInput = gqlFormDataInput

    const programs = stateCode
        ? [must(findStatePrograms(stateCode))[0]]
        : [defaultFloridaProgram()]
    const programIDs = programs.map((program) => program.id)

    const contractDocs = formDataInput?.contractDocuments
        ? formDataInput.contractDocuments.map((doc) => ({
              name: doc.name,
              s3URL: doc.s3URL,
              sha256: doc.s3URL,
              dateAdded: doc.dateAdded ? doc.dateAdded : undefined,
          }))
        : [
              {
                  name: 'contractDocument1.pdf',
                  s3URL: 's3://bucketname/key/contractDocument1.pdf',
                  sha256: 'needs-to-be-there',
                  dateAdded: new Date('01/02/2024'),
              },
          ]

    const supportingDocs = formDataInput?.supportingDocuments
        ? formDataInput.supportingDocuments.map((doc) => ({
              name: doc.name,
              s3URL: doc.s3URL,
              sha256: doc.s3URL,
              dateAdded: doc.dateAdded ? doc.dateAdded : undefined,
          }))
        : [
              {
                  name: 'supportingDocument11.pdf',
                  s3URL: 's3://bucketname/key/supportingDocument11.pdf',
                  sha256: 'needs-to-be-there',
                  dateAdded: new Date('01/02/2024'),
              },
          ]

    const stateContacts = formDataInput?.stateContacts?.length
        ? formDataInput.stateContacts.map((contact) => ({
              name: contact.name,
              // Coalesce null (from read data round-tripped back through this
              // mock) to undefined; stateContactSchema treats these as optional
              // strings and rejects null.
              givenName: contact.givenName ?? undefined,
              familyName: contact.familyName ?? undefined,
              suffix: contact.suffix ?? undefined,
              titleRole: contact.titleRole,
              email: contact.email,
          }))
        : [
              {
                  givenName: 'state',
                  familyName: 'contact',
                  suffix: 'JR.',
                  titleRole: 'thestatestofcontacts',
                  email: 'statemcstate@examepl.com',
              },
          ]

    return {
        programIDs: [programIDs[0]],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: true,
        submissionDescription: 'Updated submission',
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: '2025-06-01',
        contractDateEnd: '2026-06-01',
        managedCareEntities: ['MCO'],
        federalAuthorities: ['BENCHMARK'],
        inLieuServicesAndSettings: true,
        modifiedBenefitsProvided: true,
        modifiedGeoAreaServed: true,
        modifiedMedicaidBeneficiaries: true,
        modifiedRiskSharingStrategy: true,
        modifiedIncentiveArrangements: true,
        modifiedWitholdAgreements: true,
        modifiedStateDirectedPayments: true,
        modifiedPassThroughPayments: false,
        modifiedPaymentsForMentalDiseaseInstitutions: false,
        modifiedMedicalLossRatioStandards: false,
        modifiedOtherFinancialPaymentIncentive: false,
        modifiedEnrollmentProcess: false,
        modifiedGrevienceAndAppeal: false,
        modifiedNetworkAdequacyStandards: true,
        modifiedLengthOfContract: true,
        modifiedNonRiskPaymentArrangements: true,
        statutoryRegulatoryAttestation: true,
        statutoryRegulatoryAttestationDescription:
            'Hi, I should be gone after update.',
        ...formDataInput,
        contractDocuments: contractDocs,
        supportingDocuments: supportingDocs,
        stateContacts: stateContacts,
    }
}

// Draft form data input for an ILOS submission. Only the fields an ILOS
// submission carries are set: ilosContractFormDataSchema rejects health plan
// fields, so this mock is separate from the health plan one above.
const mockGqlILOSContractDraftRevisionFormDataInput = (
    stateCode?: string,
    formDataInput?: Partial<ContractDraftRevisionFormDataInput>
): ContractDraftRevisionFormDataInput => {
    const programs = stateCode
        ? [must(findStatePrograms(stateCode))[0]]
        : [defaultFloridaProgram()]

    return {
        programIDs: [programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'An ILOS actuarial report',
        contractType: 'BASE',
        // Health plan lists are non-null on the input type; ILOS keeps them empty.
        contractDocuments: [],
        supportingDocuments: [],
        managedCareEntities: [],
        federalAuthorities: [],
        stateContacts: [
            {
                givenName: 'state',
                familyName: 'contact',
                titleRole: 'thestatestofcontacts',
                email: 'statemcstate@examepl.com',
            },
        ],
        isILOSRatesIncluded: true,
        ilosRateDateStart: '2025-01-01',
        ilosRateDateEnd: '2025-12-31',
        ilosDocuments: [
            {
                name: 'ilosReport1.pdf',
                s3URL: 's3://bucketname/key/ilosReport1.pdf',
                sha256: 'needs-to-be-there',
            },
        ],
        ...formDataInput,
    }
}

export {
    mockGqlContractDraftRevisionFormDataInput,
    mockGqlILOSContractDraftRevisionFormDataInput,
}

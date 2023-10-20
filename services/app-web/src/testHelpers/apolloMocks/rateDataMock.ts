import {
    Rate,
    RateRevision,
    RelatedContractRevisions,
} from '../../gen/gqlClient'
import { mockMNState } from './stateMock'
import { v4 as uuidv4 } from 'uuid'

const contractRevisionOnRateDataMock = (
    data?: Partial<RelatedContractRevisions>
): RelatedContractRevisions => ({
    __typename: 'RelatedContractRevisions',
    id: uuidv4(),
    contract: {
        __typename: 'ContractOnRevisionType',
        id: uuidv4(),
        stateCode: 'MN',
        stateNumber: 3,
    },
    createdAt: '2023-10-16T18:52:16.295Z',
    updatedAt: '2023-10-16T19:02:26.795Z',
    submitInfo: {
        __typename: 'UpdateInformation',
        updatedAt: '2023-10-16T19:02:26.795Z',
        updatedBy: 'aang@example.com',
        updatedReason: 'Initial submission',
    },
    unlockInfo: null,
    formData: {
        __typename: 'ContractFormData',
        programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: false,
        submissionDescription: 'description of contract and rates submission',
        stateContacts: [
            {
                __typename: 'StateContact',
                name: 'Name',
                title: null,
                email: 'example@example.com',
            },
        ],
        supportingDocuments: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                __typename: 'GenericDocument',
                name: 'contract-document.pdf',
                s3URL: 's3://bucketname/key/contract-document',
                sha256: 'fakeSha',
            },
        ],
        contractDateStart: '2024-04-01',
        contractDateEnd: '2025-03-31',
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN'],
        inLieuServicesAndSettings: false,
        modifiedBenefitsProvided: null,
        modifiedGeoAreaServed: null,
        modifiedMedicaidBeneficiaries: null,
        modifiedRiskSharingStrategy: true,
        modifiedIncentiveArrangements: true,
        modifiedWitholdAgreements: false,
        modifiedStateDirectedPayments: false,
        modifiedPassThroughPayments: false,
        modifiedPaymentsForMentalDiseaseInstitutions: true,
        modifiedMedicalLossRatioStandards: null,
        modifiedOtherFinancialPaymentIncentive: null,
        modifiedEnrollmentProcess: null,
        modifiedGrevienceAndAppeal: null,
        modifiedNetworkAdequacyStandards: null,
        modifiedLengthOfContract: null,
        modifiedNonRiskPaymentArrangements: true,
    },
    ...data,
})
const rateRevisionDataMock = (data?: Partial<RateRevision>): RateRevision => {
    return {
        __typename: 'RateRevision',
        id: uuidv4(),
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:02:26.767Z',
        unlockInfo: null,
        submitInfo: {
            __typename: 'UpdateInformation',
            updatedAt: '2023-10-16T19:02:26.766Z',
            updatedBy: 'aang@example.com',
            updatedReason: 'Initial submission',
        },
        formData: {
            __typename: 'RateFormData',
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDocuments: [
                {
                    __typename: 'GenericDocument',
                    name: 'rate-document.pdf',
                    s3URL: 's3://bucketname/key/rate-document',
                    sha256: 'fakeSha',
                },
            ],
            supportingDocuments: [
                {
                    __typename: 'GenericDocument',
                    name: 'rate-supporting-document.pdf',
                    s3URL: 's3://bucketname/key/rate-supporting-document',
                    sha256: 'fakeSha',
                },
            ],
            rateDateStart: '2023-02-01',
            rateDateEnd: '2025-03-01',
            rateDateCertified: '2024-03-01',
            amendmentEffectiveDateStart: '2024-03-01',
            amendmentEffectiveDateEnd: '2025-03-01',
            rateProgramIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
            rateCertificationName:
                'MCR-MN-0003-PMAP-RATE-20240301-20250301-AMENDMENT-20240301',
            certifyingActuaryContacts: [
                {
                    __typename: 'ActuaryContact',
                    name: 'Actuary Contact Person',
                    titleRole: 'Actuary Contact Title',
                    email: 'actuarycontact@example.com',
                    actuarialFirm: 'MERCER',
                    actuarialFirmOther: '',
                },
            ],
            addtlActuaryContacts: [
                {
                    __typename: 'ActuaryContact',
                    name: 'Additional actuary name',
                    titleRole: 'Additional actuary title',
                    email: 'additonalactuary@example.com',
                    actuarialFirm: 'MILLIMAN',
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            packagesWithSharedRateCerts: [
                {
                    __typename: 'PackageWithSameRate',
                    packageName: 'MCR-MN-0001-PMAP',
                    packageId: 'f3306599-a1c9-411a-87ac-fa3541c3e723',
                    packageStatus: 'DRAFT',
                },
                {
                    __typename: 'PackageWithSameRate',
                    packageName: 'MCR-MN-0002-PMAP',
                    packageId: '1bf66cff-512b-4a30-bea8-5e27d1764810',
                    packageStatus: 'SUBMITTED',
                },
            ],
        },
        contractRevisions: [contractRevisionOnRateDataMock()],
        ...data,
    }
}

const rateDataMock = (rateData?: Partial<Rate>): Rate => ({
    __typename: 'Rate',
    id: uuidv4(),
    createdAt: '2023-10-16T19:01:21.389Z',
    updatedAt: '2023-10-16T19:01:21.389Z',
    stateCode: 'MN',
    stateNumber: 10,
    state: mockMNState(),
    status: 'RESUBMITTED',
    initiallySubmittedAt: '2023-10-16',
    draftRevision: null,
    revisions: [
        rateRevisionDataMock({
            unlockInfo: {
                __typename: 'UpdateInformation',
                updatedAt: '2023-10-16T19:05:26.585Z',
                updatedBy: 'zuko@example.com',
                updatedReason: 'Unlock',
            },
            submitInfo: {
                __typename: 'UpdateInformation',
                updatedAt: '2023-10-16T19:06:20.581Z',
                updatedBy: 'aang@example.com',
                updatedReason: 'Resubmit',
            },
            contractRevisions: [
                contractRevisionOnRateDataMock({
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2023-10-16T19:06:20.643Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Resubmit',
                    },
                    unlockInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2023-10-16T19:05:26.660Z',
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'Unlock',
                    },
                }),
            ],
        }),
        rateRevisionDataMock(),
    ],
})

export { rateDataMock, rateRevisionDataMock }

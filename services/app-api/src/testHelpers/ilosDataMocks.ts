import { v4 as uuidv4 } from 'uuid'
import type {
    ContractFormDataType,
    ContractType,
    RateType,
} from '../domain-models'
import { s3DlUrl } from './documentHelpers'
import { defaultFloridaProgram } from './gqlHelpers'

const mockILOSDocument = (name: string) => ({
    s3URL: `s3://bucketname/key/${name}`,
    sha256: 'fakesha',
    name,
    dateAdded: new Date('01/15/2024'),
    downloadURL: s3DlUrl,
})

const mockILOSContractFormData = (
    overrides?: Partial<ContractFormDataType>
): ContractFormDataType => ({
    programIDs: [defaultFloridaProgram().id],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'An ILOS actuarial report',
    contractType: 'BASE',
    stateContacts: [
        {
            name: 'Some One',
            givenName: 'Some',
            familyName: 'One',
            email: 'someone@example.com',
            titleRole: 'sometitle',
        },
    ],
    contractDocuments: [],
    supportingDocuments: [],
    managedCareEntities: [],
    federalAuthorities: [],
    isILOSRatesIncluded: true,
    ilosDocuments: [mockILOSDocument('ilosReport1')],
    ilosSupportingDocuments: [mockILOSDocument('ilosSupporting1')],
    ilosExternalRates: [
        {
            id: uuidv4(),
            rateControlName: 'FL-RATE-001',
            rateDateStart: new Date('2025-01-01'),
            rateDateEnd: new Date('2025-12-31'),
            position: 2,
        },
    ],
    ...overrides,
})

// A rate owned by another contract, as linked rates always are.
const mockILOSLinkedRate = (parentContractID: string): RateType => ({
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'SUBMITTED',
    reviewStatus: 'UNDER_REVIEW',
    consolidatedStatus: 'SUBMITTED',
    stateCode: 'FL',
    stateNumber: 5,
    parentContractID,
    packageSubmissions: [],
    draftRevision: undefined,
    revisions: [],
})

const mockDraftILOSContract = (
    overrides?: Partial<ContractFormDataType>
): ContractType => {
    const contractID = uuidv4()
    return {
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: contractID,
        stateCode: 'FL',
        stateNumber: 5,
        contractSubmissionType: 'ILOS',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'DRAFT',
        mccrsID: undefined,
        revisions: [],
        draftRevision: {
            id: uuidv4(),
            submitInfo: undefined,
            unlockInfo: undefined,
            contract: {
                id: contractID,
                stateCode: 'FL',
                stateNumber: 5,
                contractSubmissionType: 'ILOS',
            },
            createdAt: new Date('2023-11-27'),
            updatedAt: new Date('2023-11-27'),
            formData: mockILOSContractFormData(overrides),
        },
        // Linked rates are always owned by another contract.
        draftRates: [mockILOSLinkedRate(uuidv4())],
        packageSubmissions: [],
    }
}

export {
    mockILOSDocument,
    mockILOSContractFormData,
    mockILOSLinkedRate,
    mockDraftILOSContract,
}

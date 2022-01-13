import { toProtoBuffer } from './toProtoBuffer'
import { statesubmission } from '../../../gen/stateSubmissionProto'
import { toDomain } from './toDomain'
import {
    DraftSubmissionType,
    isStateSubmission,
    StateSubmissionType,
} from '../../domain-models'
import { ZodError } from 'zod'

const newSubmission: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [],
    contractDocuments: [],
    rateDocuments: [],
    managedCareEntities: [],
    federalAuthorities: [],
    stateContacts: [],
    actuaryContacts: [],
}

const basicSubmission: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [],
    rateDocuments: [],
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    stateContacts: [],
    actuaryContacts: [],
}

const contractOnly: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'A real submission',
    documents: [],
    contractDocuments: [],
    rateDocuments: [],
    contractType: 'BASE',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    stateContacts: [],
    actuaryContacts: [],
}

const moreFullSubmission: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [],
    rateDocuments: [],
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    stateContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
        },
    ],
    actuaryContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
            actuarialFirm: 'OTHER' as const,
            actuarialFirmOther: 'ACME',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
            actuarialFirm: 'MERCER' as const,
        },
    ],
}

const nowWithDocuments: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 'www.example.com/foo.png',
            name: 'rates and contract addendum doc',
            documentCategories: ['CONTRACT_RELATED', 'RATES_RELATED'],
        },
    ],
    contractType: 'BASE',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT'],
        },
    ],
    rateDocuments: [],
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    stateContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
        },
    ],
    actuaryContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
            actuarialFirm: 'OTHER' as const,
            actuarialFirmOther: 'ACME',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
            actuarialFirm: 'MERCER' as const,
        },
    ],
}

const fullRateAmendment: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 'www.example.com/foo.png',
            name: 'rates and contract addendum doc',
            documentCategories: ['CONTRACT_RELATED', 'RATES_RELATED'],
        },
    ],
    contractType: 'BASE',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [],
    rateDocuments: [],
    managedCareEntities: ['PIHP'],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    rateType: 'AMENDMENT',
    rateDateStart: new Date(Date.UTC(2021, 4, 22)),
    rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
    rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
    rateAmendmentInfo: {
        effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
        effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
    },
    stateContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
        },
    ],
    actuaryContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
            actuarialFirm: 'OTHER' as const,
            actuarialFirmOther: 'ACME',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
            actuarialFirm: 'MERCER' as const,
        },
    ],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
}

const fullContractInfo: DraftSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT_RELATED'],
        },
        {
            s3URL: 'www.example.com/foo.png',
            name: 'rates and contract addendum doc',
            documentCategories: ['CONTRACT_RELATED', 'RATES_RELATED'],
        },
    ],
    contractType: 'AMENDMENT',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT'],
        },
    ],
    rateDocuments: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'Rates certification',
            documentCategories: ['RATES'],
        },
    ],
    contractAmendmentInfo: {
        itemsBeingAmended: [
            'ENROLLEE_ACCESS',
            'GEO_AREA_SERVED',
            'CAPITATION_RATES',
            'OTHER',
        ],
        otherItemBeingAmended: 'OTHERAMEND',
        capitationRatesAmendedInfo: {
            reason: 'OTHER',
            otherReason: 'somethingelse',
        },
        relatedToCovid19: true,
        relatedToVaccination: false,
    },
    managedCareEntities: ['PIHP'],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    rateType: 'AMENDMENT',
    rateDateStart: new Date(Date.UTC(2021, 4, 22)),
    rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
    rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
    rateAmendmentInfo: {
        effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
        effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
    },
    stateContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
        },
    ],
    actuaryContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
            actuarialFirm: 'OTHER' as const,
            actuarialFirmOther: 'ACME',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
            actuarialFirm: 'MERCER' as const,
        },
    ],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
}

const someOthers: DraftSubmissionType = {
    id: 'test-abc-123',
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateCode: 'MN',
    stateNumber: 5,
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'A real submission',
    documents: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT_RELATED'],
        },
    ],
    contractType: 'AMENDMENT',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [],
    contractAmendmentInfo: {
        itemsBeingAmended: [
            'ENROLLEE_ACCESS',
            'GEO_AREA_SERVED',
            'CAPITATION_RATES',
            'OTHER',
        ],
        otherItemBeingAmended: 'OTHERAMEND',
        capitationRatesAmendedInfo: {
            reason: 'OTHER',
            otherReason: 'somethingelse',
        },
        relatedToCovid19: true,
        relatedToVaccination: false,
    },
    managedCareEntities: ['PIHP', 'PCCM'],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    rateType: 'AMENDMENT',
    rateDocuments: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'rates cert 1',
            documentCategories: ['RATES_RELATED'],
        },
        {
            s3URL: 'www.example.com/foo.png',
            name: 'rates cert 2',
            documentCategories: ['RATES_RELATED'],
        },
    ],
    rateDateStart: new Date(Date.UTC(2021, 4, 22)),
    rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
    rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
    rateAmendmentInfo: {
        effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
        effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
    },
    stateContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
        },
    ],
    actuaryContacts: [
        {
            name: 'foo bar',
            titleRole: 'manager',
            email: 'soandso@example.com',
            actuarialFirm: 'OTHER' as const,
            actuarialFirmOther: 'ACME',
        },
        {
            name: 'Fine Bab',
            titleRole: 'supervisor',
            email: 'lodar@example.com',
            actuarialFirm: 'MERCER' as const,
        },
    ],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
}

const basicCompleteLiteral: StateSubmissionType = {
    createdAt: new Date(Date.UTC(2021, 4, 10)),
    updatedAt: new Date(),
    submittedAt: new Date(),
    status: 'SUBMITTED',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programIDs: ['snbc'],
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(Date.UTC(2021, 4, 22)),
    contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
    contractDocuments: [
        {
            s3URL: 'www.example.com/foo.png',
            name: 'contract doc',
            documentCategories: ['CONTRACT'],
        },
    ],
    managedCareEntities: ['PIHP'],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    stateContacts: [
        {
            name: 'Some Body',
            email: 's@example.com',
            titleRole: 'Manager',
        },
    ],
    actuaryContacts: [
        {
            name: 'Anne Acturay',
            email: 'aa@example.com',
            titleRole: 'Deputy',
            actuarialFirm: 'STATE_IN_HOUSE',
        },
    ],
    rateDocuments: [],
}

describe('Validate encoding to protobuf and decoding back to domain model', () => {
    if (!isStateSubmission(basicCompleteLiteral)) {
        throw new Error(
            'Bad test, the state submission is not a state submission'
        )
    }

    test.each([
        newSubmission,
        basicSubmission,
        contractOnly,
        moreFullSubmission,
        nowWithDocuments,
        fullRateAmendment,
        fullContractInfo,
        someOthers,
        basicCompleteLiteral,
    ])(
        'given valid domain model %j expect protobufs to be symmetric)',
        (domainObject: DraftSubmissionType | StateSubmissionType) => {
            expect(toDomain(toProtoBuffer(domainObject))).toEqual(domainObject)
        }
    )
})

describe('handles invalid data as expected', () => {
    it('toDomain errors when passed an empty proto message', () => {
        const protoMessage = new statesubmission.StateSubmissionInfo({})
        const encodedEmpty =
            statesubmission.StateSubmissionInfo.encode(protoMessage).finish()

        const maybeError = toDomain(encodedEmpty)

        expect(maybeError).toBeInstanceOf(Error)
        expect(maybeError.toString()).toEqual(
            'Error: Unknown or missing status on this proto. Cannot decode.'
        )
    })

    it('toDomain returns a decode error when passed an invalid DraftSubmission', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidDraft = Object.assign({}, basicSubmission) as any
        delete invalidDraft.id
        delete invalidDraft.stateNumber
        invalidDraft.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidDraft)
        const decodeErr = toDomain(encoded)

        expect(decodeErr).toBeInstanceOf(Error)

        // the zod error should note these three fields are wrong
        const zErr = decodeErr as ZodError
        expect(zErr.issues.flatMap((zodErr) => zodErr.path)).toEqual([
            'id',
            'stateNumber',
            'submissionType',
        ])
    })

    it('toDomain returns a decode error when passed an invalid StateSubmission', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidSubmission = Object.assign({}, basicCompleteLiteral) as any
        delete invalidSubmission.id
        delete invalidSubmission.stateNumber
        invalidSubmission.documents = []
        invalidSubmission.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidSubmission)
        const decodeErr = toDomain(encoded)

        expect(decodeErr).toBeInstanceOf(Error)
        expect(decodeErr.toString()).toEqual(
            'Error: ERROR: attempting to parse state submission proto failed'
        )
    })
})

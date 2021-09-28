import { toProtoBuffer } from '../src/stateSubmissionEncoding'
import { toDomain } from '../src/stateSubmissionEncoding'
import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

const newSubmission: DraftSubmissionType = {
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'DRAFT',
    stateNumber: 5,
    id: 'test-abc-123',
    stateCode: 'MN',
    programID: 'snbc',
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(),
    contractDateEnd: new Date(),
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    stateContacts: [],
    actuaryContacts: [],
}

describe('toProtoBuffer', () => {
    test.each([
        [newSubmission, ''],
        // [validDomain1, )],
        // [validDomain2, ],
    ])('given valid domain model %j expect %o)', (domainObject) => {
        expect(toDomain(toProtoBuffer(domainObject))).toBe(domainObject)
    })

    // test.each([[invalidDomain1]])(
    //     'given invalid object %o expect error)',
    //     (invalidDomainObject) => {
    //         expect(toProtoBuffer(invalidDomainObject)).toThrowError()
    //     }
    // )
})

// DRAFT SUBMISSIONS

// const draftSubmission = {
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     id: 'test-abc-123',
//     stateCode: 'MN',
//     programID: 'snbc',
//     program: {
//         id: 'snbc',
//         name: 'SNBC',
//     },
//     name: 'MN-MSHO-0001',
//     submissionType: 'CONTRACT_ONLY',
//     submissionDescription: 'A real submission',
//     documents: [],
//     contractType: 'BASE',
//     contractDateStart: new Date(),
//     contractDateEnd: new Date(),
//     contractAmendmentInfo: null,
//     managedCareEntities: [],
//     federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
//     rateType: null,
//     rateDateStart: null,
//     rateDateEnd: null,
//     rateDateCertified: null,
//     rateAmendmentInfo: null,
//     stateContacts: [],
//     actuaryContacts: [],
//     actuaryCommunicationPreference: null,
// }

// export function mockContactAndRatesDraft(): DraftSubmission {
//     return {
//         __typename: 'DraftSubmission',
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         id: 'test-abc-123',
//         stateCode: 'MN',
//         programID: 'snbc',
//         program: {
//             id: 'snbc',
//             name: 'SNBC',
//         },
//         name: 'MN-MSHO-0001',
//         submissionType: 'CONTRACT_AND_RATES',
//         submissionDescription: 'A real submission',
//         documents: [],
//         contractType: 'BASE',
//         contractDateStart: new Date(),
//         contractDateEnd: dayjs().add(2, 'days').toDate(),
//         contractAmendmentInfo: null,
//         managedCareEntities: [],
//         federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
//         rateType: null,
//         rateDateStart: null,
//         rateDateEnd: null,
//         rateDateCertified: null,
//         rateAmendmentInfo: null,
//         stateContacts: [],
//         actuaryContacts: [],
//         actuaryCommunicationPreference: null,
//     }
// }

// export function mockCompleteDraft(): DraftSubmission {
//     return {
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         id: 'test-abc-123',
//         stateCode: 'MN',
//         programID: 'snbc',
//         program: {
//             id: 'snbc',
//             name: 'SNBC',
//         },
//         name: 'MN-MSHO-0001',
//         submissionType: 'CONTRACT_ONLY',
//         submissionDescription: 'A real submission',
//         documents: [],
//         contractType: 'BASE',
//         contractDateStart: new Date(),
//         contractDateEnd: new Date(),
//         contractAmendmentInfo: null,
//         managedCareEntities: [],
//         federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
//         rateType: 'NEW',
//         rateDateStart: new Date(),
//         rateDateEnd: new Date(),
//         rateDateCertified: new Date(),
//         rateAmendmentInfo: null,
//         stateContacts: [
//             {
//                 name: 'Test Person',
//                 titleRole: 'A Role',
//                 email: 'test@test.com',
//             },
//         ],
//         actuaryContacts: [],
//         actuaryCommunicationPreference: null,
//     }
// }

// function mockNewDraft(): DraftSubmission {
//     return {
//         __typename: 'DraftSubmission',
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         id: 'test-abc-124',
//         stateCode: 'MN',
//         programID: 'snbc',
//         program: {
//             id: 'snbc',
//             name: 'SNBC',
//         },
//         name: 'MN-MSHO-0002',
//         submissionType: 'CONTRACT_ONLY',
//         submissionDescription: 'A real submission',
//         documents: [],
//         contractType: null,
//         contractDateStart: null,
//         contractDateEnd: null,
//         contractAmendmentInfo: null,
//         managedCareEntities: [],
//         federalAuthorities: [],
//         rateType: null,
//         rateDateStart: null,
//         rateDateEnd: null,
//         rateDateCertified: null,
//         stateContacts: [],
//         actuaryContacts: [],
//         actuaryCommunicationPreference: null,
//     }
// }

import { toSerializable } from '../src/helpers'

const draftSubmission = {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: 'test-abc-123',
    stateCode: 'MN',
    programID: 'snbc',
    program: {
        id: 'snbc',
        name: 'SNBC',
    },
    name: 'MN-MSHO-0001',
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(),
    contractDateEnd: new Date(),
    contractAmendmentInfo: null,
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    rateType: null,
    rateDateStart: null,
    rateDateEnd: null,
    rateDateCertified: null,
    rateAmendmentInfo: null,
    stateContacts: [],
    actuaryContacts: [],
    actuaryCommunicationPreference: null,
}

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

describe('toSerializable', () => {
    const invalidDomain1 = {
        contractAmendmentInfo: {
            itemsBeingAmended: ['INVALID_ENUM', 'OTHER'],
            otherItemBeingAmended: 'This is why items amended',
            relatedToCovid19: 'a boolean',
        },
    }

    test.each([
        [draftSubmission, JSON.stringify(draftSubmission)],
        // [validDomain1, JSON.stringify(validDomain1)],
        // [validDomain2, JSON.stringify(validDomain2)],
    ])('given valid domain model %j expect %o)', (domainObject, expected) => {
        expect(toSerializable(domainObject)).toBe(expected)
    })

    // test.each([[invalidDomain1]])(
    //     'given invalid object %o expect error)',
    //     (invalidDomainObject) => {
    //         expect(toSerializable(invalidDomainObject)).toThrowError()
    //     }
    // )
})

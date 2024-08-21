import { ZodError } from 'zod'
import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
    contractOnly,
    unlockedWithALittleBitOfEverything,
    unlockedWithContacts,
    unlockedWithDocuments,
    unlockedWithFullContracts,
    unlockedWithFullRates,
    newHealthPlanFormData,
} from '../../healthPlanFormDataMocks'
import {
    UnlockedHealthPlanFormDataType,
    isLockedHealthPlanFormData,
    LockedHealthPlanFormDataType,
} from '../../healthPlanFormDataType'
import { base64ToDomain, domainToBase64, protoToBase64 } from './protoBase64'
import { toProtoBuffer } from './toProtoBuffer'

describe('Validate encoding to base64 and decoding back to domain model', () => {
    if (!isLockedHealthPlanFormData(basicLockedHealthPlanFormData())) {
        throw new Error(
            'Bad test, the state submission is not a state submission'
        )
    }

    test.each([
        newHealthPlanFormData(),
        basicHealthPlanFormData(),
        contractOnly(),
        unlockedWithContacts(),
        unlockedWithDocuments(),
        unlockedWithFullRates(),
        unlockedWithFullContracts(),
        unlockedWithALittleBitOfEverything(),
        basicLockedHealthPlanFormData(),
    ])(
        'given valid domain model %j expect protobufs to be symmetric)',
        (
            domainObject:
                | UnlockedHealthPlanFormDataType
                | LockedHealthPlanFormDataType
        ) => {
            expect(base64ToDomain(domainToBase64(domainObject))).toEqual(
                domainObject
            )
        }
    )
})

describe('Validate encoding to proto to base64 and decoding back to domain model', () => {
    if (!isLockedHealthPlanFormData(basicLockedHealthPlanFormData())) {
        throw new Error(
            'Bad test, the state submission is not a state submission'
        )
    }

    test.each([
        newHealthPlanFormData(),
        basicHealthPlanFormData(),
        contractOnly(),
        unlockedWithContacts(),
        unlockedWithDocuments(),
        unlockedWithFullRates(),
        unlockedWithFullContracts(),
        unlockedWithALittleBitOfEverything(),
        basicLockedHealthPlanFormData(),
    ])(
        'given valid domain model %j expect protobufs to be symmetric)',
        (
            domainObject:
                | UnlockedHealthPlanFormDataType
                | LockedHealthPlanFormDataType
        ) => {
            expect(
                base64ToDomain(protoToBase64(toProtoBuffer(domainObject)))
            ).toEqual(domainObject)
        }
    )
})

describe('handles invalid data as expected', () => {
    it('base64ToDomain errors when passed an empty proto message', () => {
        const protoMessage = new mcreviewproto.HealthPlanFormData({})
        const encodedEmpty =
            mcreviewproto.HealthPlanFormData.encode(protoMessage).finish()

        const emptyBase64 = protoToBase64(encodedEmpty)

        const maybeError = base64ToDomain(emptyBase64)

        expect(maybeError).toBeInstanceOf(Error)
        expect(maybeError.toString()).toBe(
            'Error: Unknown or missing status on this proto. Cannot decode.'
        )
    })

    it('base64ToDomain returns a decode error when passed an invalid FormData', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidDraft = Object.assign({}, basicHealthPlanFormData()) as any
        delete invalidDraft.id
        delete invalidDraft.stateNumber
        invalidDraft.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidDraft)
        const encodedBase64 = protoToBase64(encoded)
        const decodeErr = base64ToDomain(encodedBase64)

        expect(decodeErr).toBeInstanceOf(Error)

        // the zod error should note these three fields are wrong
        const zErr = decodeErr as ZodError
        expect(zErr.issues.flatMap((zodErr) => zodErr.path)).toEqual([
            'id',
            'stateNumber',
            'submissionType',
        ])
    })

    it('base64ToDomain returns a decode error when passed an invalid StateSubmission', () => {
        const invalidSubmission = Object.assign(
            {},
            basicLockedHealthPlanFormData()
        ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
        delete invalidSubmission.id
        delete invalidSubmission.stateNumber
        invalidSubmission.documents = []
        invalidSubmission.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidSubmission)
        const encodedBase64 = protoToBase64(encoded)
        const decodeErr = base64ToDomain(encodedBase64)

        expect(decodeErr).toBeInstanceOf(Error)
        expect(decodeErr.toString()).toBe(
            'Error: ERROR: attempting to parse state submission proto failed'
        )
    })
})

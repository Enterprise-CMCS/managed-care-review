import { ZodError } from 'zod'
import { statesubmission } from '../../../gen/stateSubmissionProto'
import {
    basicStateSubmission, basicSubmission,
    contractOnly, draftWithALittleBitOfEverything, draftWithContacts,
    draftWithDocuments, draftWithFullContracts, draftWithFullRates, newSubmission
} from '../../domain-mocks'
import {
    DraftSubmissionType,
    isStateSubmission,
    StateSubmissionType
} from '../../domain-models'
import { base64ToDomain, domainToBase64, protoToBase64 } from './protoBase64'
import { toProtoBuffer } from './toProtoBuffer'

describe('Validate encoding to base64 and decoding back to domain model', () => {
    if (!isStateSubmission(basicStateSubmission())) {
        throw new Error(
            'Bad test, the state submission is not a state submission'
        )
    }

    test.each([
        newSubmission(),
        basicSubmission(),
        contractOnly(),
        draftWithContacts(),
        draftWithDocuments(),
        draftWithFullRates(),
        draftWithFullContracts(),
        draftWithALittleBitOfEverything(),
        basicStateSubmission()
    ])(
        'given valid domain model %j expect protobufs to be symmetric)',
        (domainObject: DraftSubmissionType | StateSubmissionType) => {
            expect(base64ToDomain(domainToBase64(domainObject))).toEqual(domainObject)
        }
    )
})

describe('Validate encoding to proto to base64 and decoding back to domain model', () => {
    if (!isStateSubmission(basicStateSubmission())) {
        throw new Error(
            'Bad test, the state submission is not a state submission'
        )
    }

    test.each([
        newSubmission(),
        basicSubmission(),
        contractOnly(),
        draftWithContacts(),
        draftWithDocuments(),
        draftWithFullRates(),
        draftWithFullContracts(),
        draftWithALittleBitOfEverything(),
        basicStateSubmission()
    ])(
        'given valid domain model %j expect protobufs to be symmetric)',
        (domainObject: DraftSubmissionType | StateSubmissionType) => {
            expect(base64ToDomain(protoToBase64(toProtoBuffer(domainObject)))).toEqual(domainObject)
        }
    )
})

describe('handles invalid data as expected', () => {
    it('base64ToDomain errors when passed an empty proto message', () => {
        const protoMessage = new statesubmission.StateSubmissionInfo({})
        const encodedEmpty =
            statesubmission.StateSubmissionInfo.encode(protoMessage).finish()

        const emptyBase64 = protoToBase64(encodedEmpty)

        const maybeError = base64ToDomain(emptyBase64)

        expect(maybeError).toBeInstanceOf(Error)
        expect(maybeError.toString()).toEqual(
            'Error: Unknown or missing status on this proto. Cannot decode.'
        )
    })

    it('base64ToDomain returns a decode error when passed an invalid DraftSubmission', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidDraft = Object.assign({}, basicSubmission()) as any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidSubmission = Object.assign({}, basicStateSubmission()) as any
        delete invalidSubmission.id
        delete invalidSubmission.stateNumber
        invalidSubmission.documents = []
        invalidSubmission.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidSubmission)
        const encodedBase64 = protoToBase64(encoded)
        const decodeErr = base64ToDomain(encodedBase64)

        expect(decodeErr).toBeInstanceOf(Error)
        expect(decodeErr.toString()).toEqual(
            'Error: ERROR: attempting to parse state submission proto failed'
        )
    })
})

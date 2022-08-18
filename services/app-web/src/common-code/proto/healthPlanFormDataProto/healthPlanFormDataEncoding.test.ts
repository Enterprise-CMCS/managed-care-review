import { ZodError } from 'zod'
import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
} from '../../healthPlanFormDataMocks'

import { toDomain } from './toDomain'
import { toProtoBuffer } from './toProtoBuffer'

describe('handles invalid data as expected', () => {
    it('toDomain errors when passed an empty proto message', () => {
        const protoMessage = new mcreviewproto.HealthPlanFormData({})
        const encodedEmpty =
            mcreviewproto.HealthPlanFormData.encode(protoMessage).finish()

        const maybeError = toDomain(encodedEmpty)

        expect(maybeError).toBeInstanceOf(Error)
        expect(maybeError.toString()).toBe(
            'Error: Unknown or missing status on this proto. Cannot decode.'
        )
    })

    it('toDomain returns a decode error when passed an invalid FormData', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidDraft = Object.assign({}, basicHealthPlanFormData()) as any
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
        const invalidSubmission = Object.assign(
            {},
            basicLockedHealthPlanFormData()
        ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
        delete invalidSubmission.id
        delete invalidSubmission.stateNumber
        invalidSubmission.documents = []
        invalidSubmission.submissionType = 'nonsense'

        const encoded = toProtoBuffer(invalidSubmission)
        const decodeErr = toDomain(encoded)

        expect(decodeErr).toBeInstanceOf(Error)
        expect(decodeErr.toString()).toBe(
            'Error: ERROR: attempting to parse state submission proto failed'
        )
    })
})

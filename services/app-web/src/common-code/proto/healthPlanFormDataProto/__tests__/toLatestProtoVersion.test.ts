import fs from 'fs'
import { toLatestProtoVersion } from '../toLatestVersion'
import { decodeOrError } from '../toDomain'

describe('v1 to v2', () => {
    it('should convert a single actuary contact and communication preference as expected', () => {
        const protoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-19.proto'
        )
        const oldProto = decodeOrError(protoBytes)
        if (oldProto instanceof Error) {
            throw oldProto
        }
        if (
            !oldProto.rateInfos[0].actuaryContacts ||
            !oldProto.rateInfos[0].actuaryCommunicationPreference
        ) {
            throw new Error(
                'Test invalid. Expecting an old proto with a rate cert actuary information present.'
            )
        }

        const latestProto = toLatestProtoVersion(oldProto)
        expect(oldProto.rateInfos[0]).toBeDefined()
        expect(latestProto.protoVersion).toBe(3)
        expect(latestProto.addtlActuaryCommunicationPreference).toBe(1)
        expect(latestProto.addtlActuaryContacts).toEqual(
            expect.arrayContaining(oldProto.rateInfos[0].actuaryContacts)
        )
    })
})

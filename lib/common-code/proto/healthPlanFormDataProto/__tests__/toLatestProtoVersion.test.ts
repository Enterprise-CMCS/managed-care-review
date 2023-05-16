import fs from 'fs'
import { toLatestProtoVersion } from '../toLatestVersion'
import { decodeOrError } from '../toDomain'
import { expect } from '@jest/globals'

const pathToProtoData20220819 =
    './proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-19.proto'

describe('v2 to v3', () => {
    it('should convert actuary contacts after the first to addtlActuaryContacts and communication preference as expected', () => {
        const protoBytes = fs.readFileSync(`${pathToProtoData20220819}`)
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

        console.info(oldProto.rateInfos[0].actuaryContacts)

        const latestProto = toLatestProtoVersion(oldProto)
        expect(oldProto.rateInfos[0]).toBeDefined()
        expect(latestProto.protoVersion).toBe(3)
        expect(latestProto.addtlActuaryCommunicationPreference).toBe(1)
        expect(latestProto.rateInfos[0].actuaryContacts).toEqual(
            expect.arrayContaining([
                {
                    contact: {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                    },
                    actuarialFirmType: 7,
                    actuarialFirmOther: 'ACME',
                },
                {
                    contact: {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                    },
                    actuarialFirmType: 1,
                },
            ])
        )
        expect(latestProto.addtlActuaryContacts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contact: {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                    },
                    actuarialFirmType: 1,
                }),
            ])
        )
    })

    it('should return empty array for addtlActuaryContacts when only a single actuary contact exists', () => {
        const protoBytes = fs.readFileSync(`${pathToProtoData20220819}`)
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

        oldProto.rateInfos[0].actuaryContacts = [
            {
                contact: {
                    name: 'foo bar',
                    titleRole: 'manager',
                    email: 'soandso@example.com',
                },
                actuarialFirmType: 7,
                actuarialFirmOther: 'ACME',
            },
        ]

        const latestProto = toLatestProtoVersion(oldProto)
        expect(oldProto.rateInfos[0]).toBeDefined()
        expect(latestProto.protoVersion).toBe(3)
        expect(latestProto.addtlActuaryCommunicationPreference).toBe(1)
        expect(latestProto.rateInfos[0].actuaryContacts).toEqual(
            expect.arrayContaining([
                {
                    contact: {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                    },
                    actuarialFirmType: 7,
                    actuarialFirmOther: 'ACME',
                },
            ])
        )
        expect(latestProto.addtlActuaryContacts).toEqual(
            expect.arrayContaining([])
        )
    })
})

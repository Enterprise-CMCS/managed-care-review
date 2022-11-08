import fs from 'fs'
import {
    toDomain,
    toProtoBuffer,
} from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import { migrateProto as rateIDMigration } from '../../../../../app-proto/protoMigrations/healthPlanFormDataMigrations/0001_rate_id_migration'
import { migrateProto as initialMigration } from '../../../../../app-proto/protoMigrations/healthPlanFormDataMigrations/0000_initial_migration'
import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import * as genproto from '../../../gen/healthPlanFormDataProto'

function decodeOrError(
    buff: Uint8Array
): mcreviewproto.HealthPlanFormData | Error {
    try {
        const message = mcreviewproto.HealthPlanFormData.decode(buff)
        return message
    } catch (e) {
        return new Error(`${e}`)
    }
}

describe('0000_initial_migration', () => {
    it('version 2022-08-19 matches the expected values', async () => {
        // read the file from the filesystem
        const oldProtoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-19.proto'
        )

        // Decode proto
        const oldProto = decodeOrError(oldProtoBytes)

        if (oldProto instanceof Error) {
            throw oldProto
        }

        // initial_migration
        // There is no change to our domain model here, but a warning will be printed by toDomain
        // if we load a proto that has not had its version updated or if the version is above 1

        //Run Migration
        const migratedProto = initialMigration(oldProto)
        const migratedProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(
                migratedProto
            ).finish()

        // turn into domain model
        const migratedFormData = toDomain(migratedProtoBytes)

        if (migratedFormData instanceof Error) {
            throw migratedFormData
        }

        // add_one_month
        expect(
            migratedFormData.contractDateStart?.toISOString().split('T')[0]
        ).toBe('2021-05-22')
        expect(
            migratedFormData.contractDateEnd?.toISOString().split('T')[0]
        ).toBe('2022-05-21')
        expect(
            migratedFormData.rateInfos[0]?.rateDateStart
                ?.toISOString()
                .split('T')[0]
        ).toBe('2021-05-22')
        expect(
            migratedFormData.rateInfos[0]?.rateDateEnd
                ?.toISOString()
                .split('T')[0]
        ).toBe('2022-04-29')
        expect(
            migratedFormData.rateInfos[0]?.rateDateCertified
                ?.toISOString()
                .split('T')[0]
        ).toBe('2021-05-23')
        expect(
            migratedFormData.rateInfos[0]?.rateAmendmentInfo?.effectiveDateStart
                ?.toISOString()
                .split('T')[0]
        ).toBe('2022-06-21')
        expect(
            migratedFormData.rateInfos[0]?.rateAmendmentInfo?.effectiveDateEnd
                ?.toISOString()
                .split('T')[0]
        ).toBe('2022-10-21')
    })
})

describe('0001_rate_id_migration', () => {
    it('correctly generates rate ids for old contract and rates submissions', () => {
        //Get old proto
        const oldProtoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-19.proto'
        )
        const oldFormData = toDomain(oldProtoBytes)

        if (oldFormData instanceof Error) {
            throw oldFormData
        }

        // Decode proto
        const oldProto = decodeOrError(oldProtoBytes)

        if (oldProto instanceof Error) {
            throw oldProto
        }

        //Run Migration
        const migratedProto = rateIDMigration(oldProto)
        const migratedProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(
                migratedProto
            ).finish()

        const migratedFormData = toDomain(migratedProtoBytes)

        if (migratedFormData instanceof Error) {
            throw migratedFormData
        }

        //Rate certification name generation is a part of a different migration, so to test our rate id migration we will
        // manually generate a rate id.
        migratedFormData.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523'

        //Encoding to proto and back to domain should still be symmetric
        expect(toDomain(toProtoBuffer(migratedFormData))).toEqual(
            migratedFormData
        )

        //Rate id assertions
        expect(oldFormData.rateInfos[0].id).toBeUndefined()
        expect(migratedFormData.rateInfos[0].id).toBeDefined()
    })

    it('does not override existing rate ids', () => {
        //Get proto with rate ids
        const oldProtoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-11-07.proto'
        )

        const oldFormData = toDomain(oldProtoBytes)

        if (oldFormData instanceof Error) {
            throw oldFormData
        }

        const rateID = oldFormData.rateInfos[0].id

        // Decode proto
        const oldProto = decodeOrError(oldProtoBytes)

        if (oldProto instanceof Error) {
            throw oldProto
        }

        //Run Migration
        const migratedProto = rateIDMigration(oldProto)
        const migratedProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(
                migratedProto
            ).finish()

        const migratedFormData = toDomain(migratedProtoBytes)

        if (migratedFormData instanceof Error) {
            throw migratedFormData
        }

        //Encoding to proto and back to domain should still be symmetric
        expect(toDomain(toProtoBuffer(migratedFormData))).toEqual(oldFormData)

        //Rate id should not have changed.
        expect(migratedFormData.rateInfos[0].id).toEqual(rateID)
    })
})

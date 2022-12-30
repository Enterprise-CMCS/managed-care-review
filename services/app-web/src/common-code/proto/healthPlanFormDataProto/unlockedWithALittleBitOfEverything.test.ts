import fs from 'fs'
import {
    toDomain,
    toProtoBuffer,
} from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import { migrateProto as initialMigration } from '../../../../../app-proto/protoMigrations/healthPlanFormDataMigrations/0000_initial_migration'
import { migrateProto as rateIDMigration } from '../../../../../app-proto/protoMigrations/healthPlanFormDataMigrations/0001_rate_id_migration'
import { migrateProto as rateProgramsMigration } from '../../../../../app-proto/protoMigrations/healthPlanFormDataMigrations/0002_rate_programs_migration'
import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import * as genproto from '../../../gen/healthPlanFormDataProto'

const decodeOrError = (
    buff: Uint8Array
): mcreviewproto.HealthPlanFormData | Error => {
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
        console.info('directory: ', fs.readdirSync('.'))
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
        expect(migratedFormData.rateInfos[0].rateCertificationName).toBe(
            'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523'
        )
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

describe('0002_rate_programs_migration', () => {
    it('correctly copies package programs to rate programs for old contract and rates submissions', () => {
        //Get old proto
        const oldProtoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-19.proto'
        )
        const oldProto = decodeOrError(oldProtoBytes)

        if (oldProto instanceof Error) {
            throw oldProto
        }

        // Turn draft package to submitted package, since we only have unlocked protos to work with.
        oldProto.status = 'SUBMITTED'
        // This proto version was also missing contractDocuments, required for a SUBMITTED package.
        oldProto.contractInfo = {
            ...oldProto.contractInfo,
            contractDocuments: [
                {
                    s3Url: 's3://bucketname/key/foo.png',
                    name: 'contract doc',
                    documentCategories: [1],
                },
            ],
        }

        //We do not have ay old protos from before rate programs was introduced. So we have to manually modify the data
        // by removing rate programs from rateInfos.
        oldProto.rateInfos = oldProto.rateInfos.map((rateInfo) => ({
            ...rateInfo,
            rateProgramIds: undefined,
        }))

        // encode modified proto into proto bytes
        const modifiedOldProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(oldProto).finish()

        // Decode modified proto
        const modifiedOldProto = decodeOrError(modifiedOldProtoBytes)

        if (modifiedOldProto instanceof Error) {
            throw modifiedOldProto
        }

        //Run previous migrations then current migration on modified proto
        const migratedProto = rateProgramsMigration(
            rateIDMigration(initialMigration(modifiedOldProto))
        )
        const migratedProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(
                migratedProto
            ).finish()

        const migratedFormData = toDomain(migratedProtoBytes)

        if (migratedFormData instanceof Error) {
            throw migratedFormData
        }

        //Encoding to proto and back to domain should still be symmetric
        expect(toDomain(toProtoBuffer(migratedFormData))).toEqual(
            migratedFormData
        )

        //Rate id assertions
        expect(migratedFormData.rateInfos[0].rateProgramIDs).toHaveLength(3)
    })

    it('does not override existing rate programs', () => {
        //Get proto with rate ids
        const oldProtoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-11-07.proto'
        )

        const oldProto = decodeOrError(oldProtoBytes)

        if (oldProto instanceof Error) {
            throw oldProto
        }

        // Turn draft package to submitted package, since we only have unlocked protos to work with.
        oldProto.status = 'SUBMITTED'

        // encode modified proto into proto bytes
        const modifiedOldProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(oldProto).finish()

        // Decode modified proto
        const modifiedOldProto = decodeOrError(modifiedOldProtoBytes)

        if (modifiedOldProto instanceof Error) {
            throw modifiedOldProto
        }

        //Run Migration
        const migratedProto = rateProgramsMigration(
            rateIDMigration(initialMigration(modifiedOldProto))
        )
        const migratedProtoBytes =
            genproto.mcreviewproto.HealthPlanFormData.encode(
                migratedProto
            ).finish()

        const migratedFormData = toDomain(migratedProtoBytes)

        if (migratedFormData instanceof Error) {
            throw migratedFormData
        }

        //Get old package data to compare against migrated.
        const modifiedOldFormData = toDomain(modifiedOldProtoBytes)
        if (modifiedOldFormData instanceof Error) {
            throw modifiedOldFormData
        }

        //Encoding to proto and back to domain should still be symmetric
        expect(toDomain(toProtoBuffer(migratedFormData))).toEqual(
            modifiedOldFormData
        )

        //Rate programs should not have changed
        expect(migratedFormData.rateInfos[0].rateProgramIDs).toEqual(
            modifiedOldFormData.rateInfos[0].rateProgramIDs
        )
    })
})

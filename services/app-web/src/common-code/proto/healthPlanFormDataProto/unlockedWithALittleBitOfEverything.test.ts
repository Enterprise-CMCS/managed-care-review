import fs from 'fs'
import { toDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'

describe('unlockedWithALittleBitOfEverything migration', () => {
    it('version 2022-08-19 matches the expected values', async () => {
        // read the file from the filesystem
        console.log('directory: ', fs.readdirSync('.'))
        const protoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-19.proto'
        )

        // turn into domain model
        const formData = toDomain(protoBytes)

        if (formData instanceof Error) {
            throw formData
        }
        // assert all the migrations we care about have run

        // initial_migration
        // There is no change to our domain model here, but a warning will be printed by toDomain
        // if we load a proto that has not had its version updated.

        // add_one_month
        expect(formData.contractDateStart?.toISOString().split('T')[0]).toBe(
            '2021-05-22'
        )
        expect(formData.contractDateEnd?.toISOString().split('T')[0]).toBe(
            '2022-05-21'
        )
        expect(
            formData.rateInfos[0]?.rateDateStart?.toISOString().split('T')[0]
        ).toBe('2021-05-22')
        expect(
            formData.rateInfos[0]?.rateDateEnd?.toISOString().split('T')[0]
        ).toBe('2022-04-29')
        expect(
            formData.rateInfos[0]?.rateDateCertified
                ?.toISOString()
                .split('T')[0]
        ).toBe('2021-05-23')
        expect(
            formData.rateInfos[0]?.rateAmendmentInfo?.effectiveDateStart
                ?.toISOString()
                .split('T')[0]
        ).toBe('2022-06-21')
        expect(
            formData.rateInfos[0]?.rateAmendmentInfo?.effectiveDateEnd
                ?.toISOString()
                .split('T')[0]
        ).toBe('2022-10-21')
        expect(formData.rateInfos[0].rateCertificationName).toBe(
            'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523'
        )
    })
})

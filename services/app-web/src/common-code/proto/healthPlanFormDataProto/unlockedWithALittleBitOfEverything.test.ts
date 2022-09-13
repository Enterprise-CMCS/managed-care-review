import fs from 'fs'
import { toDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'

describe('unlockedWithALittleBitOfEverything migration', () => {
    it('version 2022-08-15 matches the expected values', async () => {
        // read the file from the filesystem
        console.log(fs.readdirSync('.'))
        const protoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-15.proto'
        )

        // turn into domain model
        const formData = toDomain(protoBytes)

        if (formData instanceof Error) {
            throw formData
        }
        // assert all the migrations we care about have run

        // add_one_month
        expect(formData.contractDateStart).toBe('2021-05-22')
        expect(formData.contractDateEnd).toBe('2022-05-21')
        expect(formData.rateDateStart).toBe('2021-05-22')
        expect(formData.rateDateEnd).toBe('2022-04-29')
        expect(formData.rateDateCertified).toBe('2021-05-23')
        expect(formData.rateAmendmentInfo?.effectiveDateStart).toBe(
            '2022-06-21'
        )
        expect(formData.rateAmendmentInfo?.effectiveDateEnd).toBe('2022-10-21')
    })

    it('version 2022-08-16 matches the expected values', async () => {
        // read the file from the filesystem
        console.log(fs.readdirSync('.'))
        const protoBytes = fs.readFileSync(
            'src/common-code/proto/healthPlanFormDataProto/testData/unlockedWithALittleBitOfEverything-2022-08-16.proto'
        )

        // turn into domain model
        const formData = toDomain(protoBytes)

        if (formData instanceof Error) {
            throw formData
        }
        // assert all the migrations we care about have run

        // add_one_month
        expect(formData.contractDateStart).toBe('2021-05-22')
        expect(formData.contractDateEnd).toBe('2022-05-21')
        expect(formData.rateDateStart).toBe('2021-05-22')
        expect(formData.rateDateEnd).toBe('2022-04-29')
        expect(formData.rateDateCertified).toBe('2021-05-23')
        expect(formData.rateAmendmentInfo?.effectiveDateStart).toBe(
            '2022-06-21'
        )
        expect(formData.rateAmendmentInfo?.effectiveDateEnd).toBe('2022-10-21')
    })
})

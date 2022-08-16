import fs from 'fs'
import { toDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'

describe('unlockedWithALittleBitOfEverything migration', () => {
    it('matches the expected values', async () => {
        // read the file from the filesystem
        console.log(fs.readdirSync('.'))
        const protoBytes = fs.readFileSync(
            'protoMigrations/tests/protos/unlockedWithALittleBitOfEverything-2022-07-01.proto'
        )

        // turn into domain model
        const formData = toDomain(protoBytes)

        if (formData instanceof Error) {
            throw formData
        }
        // assert all the migrations we care about have run

        // add_one_month // check this against an actual date, don't perpetuate the bug
        expect(formData.contractDateStart?.getMonth()).toBe(5)
        expect(formData.contractDateEnd?.getMonth()).toBe(5)
        expect(formData.rateDateStart?.getMonth()).toBe(5)
        expect(formData.rateDateEnd?.getMonth()).toBe(5)
        expect(formData.rateDateCertified?.getMonth()).toBe(5)
        expect(formData.rateAmendmentInfo?.effectiveDateStart?.getMonth()).toBe(
            5
        )
        expect(formData.rateAmendmentInfo?.effectiveDateEnd?.getMonth()).toBe(5)

        // copy_programs_to_rate

        // etc...
    })
})

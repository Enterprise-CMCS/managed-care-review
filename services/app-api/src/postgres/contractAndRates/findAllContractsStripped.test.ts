import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { must, mockInsertContractArgs } from '../../testHelpers'
import { insertDraftContract } from './insertContract'
import { findAllContractsStripped } from './findAllContractsStripped'

describe('findAllContractsStripped', () => {
    it('splits health plan and ILOS submissions by ilosOnly', async () => {
        const client = await sharedTestPrismaClient()

        const healthPlan = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )
        const ilos = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    contractSubmissionType: 'ILOS',
                    populationCovered: undefined,
                    riskBasedContract: undefined,
                    ilosRateDateStart: new Date('2025-01-01'),
                    ilosRateDateEnd: new Date('2025-12-31'),
                    ilosDocuments: [
                        {
                            name: 'ilosReport1.pdf',
                            s3URL: 's3://bucketname/key/ilosReport1.pdf',
                            s3BucketName: 'bucketname',
                            s3Key: 'allusers/key/ilosReport1.pdf',
                            sha256: 'fakesha',
                        },
                    ],
                })
            )
        )
        const contractIDs = [healthPlan.id, ilos.id]

        const contracts = must(
            await findAllContractsStripped(client, {
                contractIDs,
                includeDrafts: true,
            })
        )
        expect(contracts.map((r) => r.contractID)).toEqual([healthPlan.id])

        const ilosSubmissions = must(
            await findAllContractsStripped(client, {
                contractIDs,
                includeDrafts: true,
                ilosOnly: true,
            })
        )
        expect(ilosSubmissions.map((r) => r.contractID)).toEqual([ilos.id])
    })
})

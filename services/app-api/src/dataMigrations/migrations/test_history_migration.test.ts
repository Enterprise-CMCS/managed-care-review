import type { ContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from '../../postgres/contractAndRates'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { migrate } from './20240422103442_migrate_contract_rate_relationships'

/*
    Demo of how to test a data migration - can run and test locally with this test.

    Guidelines
    - Make sure your migration script is wrapped in a transaction and includes adequate logging.
    - Throw Error so it's easy to run repeatedly
*/

function printThinContract(contract: ContractType) {
    const thinContract = {
        id: contract.id,
        createdAt: contract.createdAt,
        status: contract.status,
        revisions: contract.revisions.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            submitInfo: r.submitInfo,
            unlockInfo: r.unlockInfo,
            rateRevisions: r.rateRevisions.map((rr) => ({
                id: rr.id,
                rateID: rr.rateID,
                createdAt: rr.createdAt,
                submitInfo: rr.submitInfo,
                unlockInfo: rr.unlockInfo,
                cert: rr.formData.rateDateCertified,
                // docs: rr.formData.rateDocuments!.map( d => ({
                //     name: d.name,
                // }))
            })),
        })),
        submissions: contract.packageSubmissions.map((s) => ({
            contractRevision: s.contractRevision.id,
            rateRevisions: s.rateRevisions.map((rr) => rr.id),
        })),
    }
    console.info('Clean Contract', JSON.stringify(thinContract, null, 2))
}

/* eslint-disable jest/no-disabled-tests, jest/expect-expect */
describe('Migrating old submissions to new tables', () => {
    it.skip('returns expected data', async () => {
        const client = await sharedTestPrismaClient()

        await client.$transaction(
            async (tx) => {
                const whatContractTho = await findContractWithHistory(
                    client,
                    '5954f04e-3c3a-4420-b784-ee90dfde7138'
                )
                if (whatContractTho instanceof Error) {
                    throw whatContractTho
                }
                const revIDs = whatContractTho.revisions.map((r) => r.id)
                const rateRevIDs = whatContractTho.revisions.flatMap((r) =>
                    r.rateRevisions.map((rr) => rr.id)
                )

                printThinContract(whatContractTho)

                const rateCreatedAt: { [id: string]: Date } = {}
                for (const rrid of rateRevIDs) {
                    const rrev = await tx.rateRevisionTable.findUnique({
                        where: { id: rrid },
                        include: {
                            rate: true,
                        },
                    })
                    if (rrev) {
                        rateCreatedAt[rrev.rate.id] = rrev.rate.createdAt
                    }
                }

                const joinEntries =
                    await client.rateRevisionsOnContractRevisionsTable.findMany(
                        {
                            where: {
                                OR: [
                                    {
                                        contractRevisionID: {
                                            in: revIDs,
                                        },
                                    },
                                    {
                                        rateRevisionID: {
                                            in: rateRevIDs,
                                        },
                                    },
                                ],
                            },
                            // include: {
                            //     rateRevision: true
                            // }
                        }
                    )

                console.info('PREJOINS', joinEntries)

                // VAL ids
                // const testContractIDs = [
                //     '5954f04e-3c3a-4420-b784-ee90dfde7138',
                //     // 'cdf88120-99e8-4252-b887-c122f7b20084',
                //     // '4db9fe78-fd9e-40be-b5c2-d6b89c7d22be',
                //     // 'f8919e8a-0259-48d4-a907-a378d526d401',
                //     // 'b9b751e5-bdb8-4710-b0e0-4a34461b637a',
                //     // '3a678ac2-07f9-4efe-ba7d-c1bed005afd5',
                //     // 'cdf88120-99e8-4252-b887-c122f7b20084',
                // ]

                // PROD IDs
                // const testContractIDs = [
                //     // '9b0222d9-35cb-4376-8da9-7ff8deb63c6f'
                //     // '68c8c9fe-2be6-42ca-86ae-1d238ef59e21',
                //     // '0e3a38a6-9247-4c69-bc66-a713a1185424',
                //     // 'e5ba95dc-f928-48aa-b357-bc1d6e4fd4a0',
                //     // '08d949da-5231-499b-a6d1-4648a1a5758f',
                // ]

                const contractsToIgnore = [
                    '5954f04e-3c3a-4420-b784-ee90dfde7138',
                    'f8919e8a-0259-48d4-a907-a378d526d401',
                    '4db9fe78-fd9e-40be-b5c2-d6b89c7d22be',
                    'cdf88120-99e8-4252-b887-c122f7b20084',
                    '5954f04e-3c3a-4420-b784-ee90dfde7138',
                ]
                const allContracts = await tx.contractTable.findMany({})
                const testContractIDs = allContracts
                    .map((c) => c.id)
                    .filter((cid) => !contractsToIgnore.includes(cid))

                const preTestContracts = []
                for (const cID of testContractIDs) {
                    const c = await findContractWithHistory(tx, cID)
                    preTestContracts.push(c)
                }

                // run the migration
                await migrate(tx, testContractIDs) //, ['4db9fe78-fd9e-40be-b5c2-d6b89c7d22be'])

                const postTestContracts = []
                for (const cID of testContractIDs) {
                    const c = await findContractWithHistory(tx, cID)
                    postTestContracts.push(c)
                }

                const unMigrated = []
                for (let i = 0; i < preTestContracts.length; i++) {
                    const preContract = preTestContracts[i]
                    const postContract = postTestContracts[i]

                    if (
                        preContract instanceof Error ||
                        postContract instanceof Error
                    ) {
                        console.error(preContract, postContract)
                        throw new Error('bad news')
                    }
                    printThinContract(postContract)

                    if (postContract.status === 'DRAFT') {
                        continue
                    }

                    if (preContract.packageSubmissions.length > 0) {
                        console.info('heres another pre migrated!', preContract)
                        unMigrated.push(preContract.id)
                        continue
                    }

                    if (postContract.packageSubmissions.length == 0) {
                        console.error(
                            'a migrated contract has no submissions!',
                            preContract
                        )
                        throw new Error('bad news 3')
                    }

                    if (
                        preContract.revisions.length !==
                        postContract.packageSubmissions.length
                    ) {
                        console.error(
                            'this contract came back wonky',
                            preContract,
                            postContract
                        )
                        throw new Error('v bad news')
                    }

                    for (let i = 0; i < preContract.revisions.length; i++) {
                        const preRev = preContract.revisions[i]
                        const postPackage = postContract.packageSubmissions[i]

                        const prevRateIDs = preRev.rateRevisions.map(
                            (r) => r.id
                        )
                        const postRevIDs = postPackage.rateRevisions.map(
                            (r) => r.id
                        )

                        expect(prevRateIDs).toEqual(postRevIDs)
                    }
                }
                console.info('Premigrated Contracts', unMigrated)

                throw new Error('ROLLBACK TO CONTINUE TESTING')
            },
            {
                timeout: 1000000,
            }
        )
    }, 1000000)
})

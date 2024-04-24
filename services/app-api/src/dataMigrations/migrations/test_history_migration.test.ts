import { findContractWithHistory } from '../../postgres/contractAndRates'
import { findRateWithHistory } from '../../postgres/contractAndRates/findRateWithHistory'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { migrate } from './20240422103442_migrate_contract_rate_relationships'

/*
    Demo of how to test a data migration - can run and test locally with this test.

    Guidelines
    - Make sure your migration script is wrapped in a transaction and includes adequate logging.
    - Throw Error so it's easy to run repeatedly
*/

/* eslint-disable jest/no-disabled-tests, jest/expect-expect */
describe('Migrating old submissions to new tables', () => {
    it('returns expected data', async () => {
        const client = await sharedTestPrismaClient()

        await client.$transaction(async (tx) => {

             // const whatRateTho = await findRateWithHistory(client, '69eb1625-540c-4cf5-b432-1306cab1a7e9')

            // console.log('PREPRE', JSON.stringify(whatRateTho, null, 2))

            // const whatContractTho = await findContractWithHistory(client, '0e3a38a6-9247-4c69-bc66-a713a1185424')

            // console.log('PREdPRE', JSON.stringify(whatContractTho, null, 2))


            // const joinEntries = await client.rateRevisionsOnContractRevisionsTable.findMany({
            //     where: {
            //         OR: [
            //             {
            //                 contractRevisionID: {
            //                     in: ['60da568d-edcf-4c71-ac0b-b6e236d624c9', '6b4c9ee3-3826-4b0a-bcfa-667b687833cc', '30ebf282-d5da-497e-8437-64a6a46efab1' ]
            //                 }
            //             },
            //             {
            //                 rateRevisionID: {
            //                     in: ['18be22ac-88bf-495e-88dc-dc422a6ffb30', '368cb05f-8a0c-4de5-bb1d-1cd0e87cd5c2', '870194fd-d646-49fc-9de8-a6650cdb94f6']
            //                 }
            //             },
            //         ]
            //     },
            //     // include: {
            //     //     rateRevision: true
            //     // }
            // })

            // console.log("PREJOINS", joinEntries)

            // VAL ids
            // const testContractIDs = [
            //     'b9b751e5-bdb8-4710-b0e0-4a34461b637a',
            //     '3a678ac2-07f9-4efe-ba7d-c1bed005afd5',
            //     '4db9fe78-fd9e-40be-b5c2-d6b89c7d22be',
            //     'cdf88120-99e8-4252-b887-c122f7b20084',
            // ]

            // PROD IDs
            const testContractIDs = [
                '0e3a38a6-9247-4c69-bc66-a713a1185424',
                'e5ba95dc-f928-48aa-b357-bc1d6e4fd4a0',
                '08d949da-5231-499b-a6d1-4648a1a5758f',
            ]

            const preTestContracts = []
            for (const cID of testContractIDs) {
                const c = await findContractWithHistory(tx, cID)
                preTestContracts.push(c)
            }

            // run the migration
            await migrate(tx, testContractIDs)//, ['4db9fe78-fd9e-40be-b5c2-d6b89c7d22be'])

            const postTestContracts = []
            for (const cID of testContractIDs) {
                console.log('finding contractsss', cID)
                const c = await findContractWithHistory(tx, cID)
                postTestContracts.push(c)
            }

            for (let i = 0; i < preTestContracts.length; i++) {
                const preContract = preTestContracts[i]
                const postContract = postTestContracts[i]

                if (preContract instanceof Error || postContract instanceof Error) {
                    console.log(preContract, postContract)
                    throw new Error('bad news')
                }

                if (preContract.packageSubmissions.length > 0) {
                    console.log('we accidentially migrate a contract that was already migrated!', preContract)
                    throw new Error('bad news 2')
                }

                if (postContract.packageSubmissions.length == 0) {
                    console.log('a migrated contract has no submissions!', preContract)
                    throw new Error('bad news 3')
                }

                if (preContract.revisions.length !== postContract.packageSubmissions.length) {
                    console.log('this contract came back wonky', preContract, postContract)
                    throw new Error('v bad news')
                }

                for (let i = 0; i < preContract.revisions.length; i++) {

                    const preRev = preContract.revisions[i]
                    const postPackage = postContract.packageSubmissions[i]

                    const prevRateIDs = preRev.rateRevisions.map(r => r.id)
                    const postRevIDs = postPackage.rateRevisions.map(r => r.id)
                    console.log('Pre Rev ID', prevRateIDs)
                    console.log('Post Rev ID', postRevIDs)


                    console.log('Pre REvs', preRev)
                    console.log('Post Pack', postPackage)

                    expect(prevRateIDs).toEqual(postRevIDs)
                }

            }

            throw new Error('ROLLBACK TO CONTINUE TESTING')
        })
    })
})

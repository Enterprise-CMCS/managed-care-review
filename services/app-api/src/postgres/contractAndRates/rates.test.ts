import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'

describe('contract and rates', () => {

    it('can insert some data into the tables', async () => {
        // this test attempts to create a number of drafts concurrently.
        // if any of the state numbers in the resultant drafts are duplicates, we have a bug.

        const client = await sharedTestPrismaClient()

        const rate0 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate0_0 = await client.rateRevisionTable.create({data: {id: uuidv4(), name: '0.0', rateCertURL: 'someurle.en'}})
        const rate0_1 = await client.rateRevisionTable.create({data: {id: uuidv4(), name: '0.1', rateCertURL: 'someurlde.en'}})

        const contractA = await client.contractTable.create({ data: { id: uuidv4() }})
        const contractA_0 = await client.contractRevisionTable.create({ data: { id: uuidv4(), name: 'A.0', contractDescription: 'something' }})
        const contractA_1 = await client.contractRevisionTable.create({ data: { id: uuidv4(), name: 'A.1', contractDescription: 'something else' }})

        expect(true).toBe(false)
        throw new Error("nope")
        // const args = {
        //     stateCode: 'FL',
        //     programIDs: ['smmc'],
        //     riskBasedContract: false,
        //     submissionType: 'CONTRACT_ONLY' as const,
        //     submissionDescription: 'concurrency state code test',
        //     contractType: 'BASE' as const,
        // }

        // const resultPromises = []
        // for (let i = 0; i < 30; i++) {
        //     resultPromises.push(insertHealthPlanPackage(client, args))
        // }

        // const results = await Promise.all(resultPromises)
        // if (results.some((result) => isStoreError(result))) {
        //     console.info('RESULTS', results)
        //     throw new Error('some of our inserts failed')
        // }

        // // Because we are erroring above if _any_ of our results are a store error
        // // we can tell the type system that all of our results are UnlockedHealthPlanFormDataType
        // const drafts = results as HealthPlanPackageType[]

        // const formDatum = drafts.map((d) => {
        //     const formDataResult = toDomain(d.revisions[0].formDataProto)
        //     if (formDataResult instanceof Error) {
        //         throw formDataResult
        //     }
        //     return formDataResult
        // })

        // // Quick way to see if there are any duplicates, throw the state numbers into
        // // a set and check that the set and the array have the same number of elements
        // const stateNumbers = formDatum.map((d) => d.stateNumber)
        // const stateNumberSet = new Set(stateNumbers)

        // if (stateNumbers.length !== stateNumberSet.size) {
        //     console.info(
        //         'We got some duplicates: ',
        //         stateNumbers.sort(),
        //         stateNumberSet.size
        //     )
        //     throw new Error('got some duplicate state numbers.')
        // }
    })
})

import { HealthPlanPackageType } from '../../domain-models'
import { toDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    insertHealthPlanPackage,
    InsertHealthPlanPackageArgsType,
} from './insertHealthPlanPackage'
import { isStoreError } from '../storeError'

describe('insertHealthPlanPackage', () => {
    // TODO this test needs to be improved its not testing anything
    // eslint-disable-next-line jest/expect-expect
    it('increases state number with every insertion', async () => {
        // this test attempts to create a number of drafts concurrently.
        // if any of the state numbers in the resultant drafts are duplicates, we have a bug.

        const client = await sharedTestPrismaClient()

        const args: InsertHealthPlanPackageArgsType = {
            stateCode: 'FL',
            populationCovered: 'MEDICAID',
            programIDs: ['smmc'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'concurrency state code test',
            contractType: 'BASE',
        }

        const resultPromises = []
        for (let i = 0; i < 30; i++) {
            resultPromises.push(insertHealthPlanPackage(client, args))
        }

        const results = await Promise.all(resultPromises)
        if (results.some((result) => isStoreError(result))) {
            console.info('RESULTS', results)
            throw new Error('some of our inserts failed')
        }

        // Because we are erroring above if _any_ of our results are a store error
        // we can tell the type system that all of our results are UnlockedHealthPlanFormDataType
        const drafts = results as HealthPlanPackageType[]

        const formDatum = drafts.map((d) => {
            const formDataResult = toDomain(d.revisions[0].formDataProto)
            if (formDataResult instanceof Error) {
                throw formDataResult
            }
            return formDataResult
        })

        // Quick way to see if there are any duplicates, throw the state numbers into
        // a set and check that the set and the array have the same number of elements
        const stateNumbers = formDatum.map((d) => d.stateNumber)
        const stateNumberSet = new Set(stateNumbers)

        if (stateNumbers.length !== stateNumberSet.size) {
            console.info(
                'We got some duplicates: ',
                stateNumbers.sort(),
                stateNumberSet.size
            )
            throw new Error('got some duplicate state numbers.')
        }
    })
})

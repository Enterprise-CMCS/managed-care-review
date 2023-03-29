import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'
import { ZodContractRevisionDraftType, ZodContractRevisionType } from "./zodDomainTypes"

describe('contract and rates', () => {

    it('can insert some data into the tables', async () => {
        // this test attempts to create a number of drafts concurrently.
        // if any of the state numbers in the resultant drafts are duplicates, we have a bug.

        const client = await sharedTestPrismaClient()

        
        
        // const rate0_1 = await client.rateRevisionTable.create({data: {id: uuidv4(), rateID: rate0.id, name: '0.1', rateCertURL: 'someurle.en'}})

        // const contractA_1 = await client.contractRevisionTable.create({ data: { id: uuidv4(), contractID: contractA.id, name: 'A.1', contractDescription: 'something else' }})


        // SCNEARIO
        // Create a new submission A (DRAFT) (incomplete)
        const contractA = await client.contractTable.create({ data: { id: uuidv4() }})
        const contractA_0 = await client.contractRevisionTable.create({ data: { id: uuidv4(), contractID: contractA.id, name: 'A.0' }})
        // Add 3 rates 1, 2, 3
        const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate1_0 = await client.rateRevisionTable.create({
            data: {
                id: uuidv4(), 
                rateID: rate1.id, 
                name: '1.0', 
                rateCertURL: 'someurle.en',
                contractRevisions: {
                    create: {
                        contractRevisionID: contractA_0.id,
                    }
                }
            }
        })
        const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate2_0 = await client.rateRevisionTable.create({
            data: {
                id: uuidv4(), 
                rateID: rate2.id, 
                name: '2.0', 
                contractRevisions: {
                    create: {
                        contractRevisionID: contractA_0.id,
                    }
                }
            }
        })
        const rate3 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate3_0 = await client.rateRevisionTable.create({
            data: {
                id: uuidv4(), 
                rateID: rate3.id, 
                name: '3.0', 
                contractRevisions: {
                    create: {
                        contractRevisionID: contractA_0.id,
                    }
                }
            },
            include: {
                contractRevisions: true
            }
        })
        // Remove 1 rate (3)
        console.log('RATE REV 3', rate3_0)
        const join3_1 = rate3_0.contractRevisions[0]
        await client.rateRevisionsOnContractRevisionsTable.update({
            where: {
                rateRevisionID_contractRevisionID_validAfter: {
                    rateRevisionID: join3_1.rateRevisionID, 
                    contractRevisionID: join3_1.contractRevisionID, 
                    validAfter: join3_1.validAfter,
                }
            },
            data: {
                validUntil: new Date()
            },
        })

        // Should be able to get out incomplete data
        const draftPackageRevisionTable = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractA.id,
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                rateRevisions: {
                    where: {
                        validUntil: null,
                    },
                    include: {
                        rateRevision: true,
                    },
                }
            }
        })

        if (!draftPackageRevisionTable) {
            throw new Error('gotta have a draft.')
        }


        const draftPackageReivision: ZodContractRevisionDraftType = {
            id: draftPackageRevisionTable.id,
            contractID: draftPackageRevisionTable.contractID,

            name: draftPackageRevisionTable.name,
            contractDescription: draftPackageRevisionTable.contractDescription || undefined,

            rateRevisions: draftPackageRevisionTable.rateRevisions.map((r) => {
                return {
                    id: r.rateRevision.id,
                    rateID: r.rateRevision.rateID,

                    name: r.rateRevision.name,
                    rateCertURL: r.rateRevision.rateCertURL || undefined,
                }
            })
        }


        console.log('OUR DRAFT', JSON.stringify(draftPackageReivision, undefined, '  '))

        // Submit
        // Should be able to get out complete data
        // Should clean up the never-submitted rate at some point.

        // Create a new Submission B
        // Add one new rate 4
        // Add a rate from A (1) -- only submitted options should be available
        // Submit

        // Unlock Submission A
        // edit
        // add rate 4 (from B)
        // Resubmit

        // Unlock Submission B
        // remove 1
        // add 2
        // Submit

        // Unlock Rate 2
        // remove A
        // Resubmit?



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

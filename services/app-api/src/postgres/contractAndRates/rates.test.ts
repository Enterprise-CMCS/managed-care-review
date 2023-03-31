import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'
import { 
    ZodContractFormDataTypeV0, 
    ZodContractFormDataTypeV1, 
    ZodContractFormDataTypeV2, 
    ZodDraftContractFormData,
    ZodContractFormDataVAll, 
    ZodContractRevisionDraftType, 
    ZodContractRevisionType, 
    ZodContractFormDataV0,
    ZodRateFormDataTypeV0,
    ZodRateFormDataTypeV1,
    ZodContractFormDataVCurrent
} from "./zodDomainTypes"
import { IORateFormDataTypeV0, IORateFormDataV0, IORateFormDataTypeV1, IORateFormDataV1 } from "./ioDomainTypes"
import { PathReporter } from 'io-ts/PathReporter'

describe('contract and rates', () => {

    it.only('can deal with zod rate versions', async () => {

        const rav0: ZodRateFormDataTypeV0 = {
            schemaName: 'rateFormData',
            schemaVersion: 0,

            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2021-02-01',
            rateDateEnd: '2022-03-02',
            amendmentDateStart: '2023-01-01',
            amendmentDateEnd: '2023-04-01',
        }

        const rnv0: ZodRateFormDataTypeV1 = {
            schemaName: 'rateFormData',
            schemaVersion: 0,

            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2021-02-01',
            rateDateEnd: '2022-03-02',
            exactStartDate: new Date(),
        }

        const badrav0 = {
            schemaName: 'rateFormData',
            schemaVersion: 0,

            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2022-03-01',
            rateDateEnd: '2022-03-02',
            amendmentDateStart: '2023-01-01',
        }

        console.log('ra0', rav0)
        console.log('rn0', rnv0)


        const rateEncode = IORateFormDataV0.encode(rav0)

        console.log('ENCODED', rateEncode)

        const parsed = IORateFormDataV0.decode(badrav0)

        console.log('Parsed: ', PathReporter.report(parsed))


        const realDates: IORateFormDataTypeV1= {
            schemaName: 'rateFormData',
            schemaVersion: 1,

            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2021-02-01',
            rateDateEnd: '2022-03-02',
            exactStartDate: new Date(),
        }

        console.log('rea dates', realDates)

        const readDateEncode = IORateFormDataV1.encode(realDates)

        const realDateString = JSON.stringify(readDateEncode)


        console.log('ENCODED', realDateString)

        const readDateJSONUp = JSON.parse(realDateString)

        const readDateAgain = IORateFormDataV1.decode(readDateJSONUp)

        console.log('decoded real date', readDateAgain)


        // Unlocked??
        


        expect(true).toBe(false)        
    })

    it('can deal with rate versions', async () => {

        const rav0: IORateFormDataTypeV0 = {
            schemaName: 'rateFormData',
            schemaVersion: 0,

            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2021-02-01',
            rateDateEnd: '2022-03-02',
            amendmentDateStart: '2023-01-01',
            amendmentDateEnd: '2023-04-01',
        }

        const rnv0: IORateFormDataTypeV0 = {
            schemaName: 'rateFormData',
            schemaVersion: 0,

            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2021-02-01',
            rateDateEnd: '2022-03-02',
        }

        const badrav0 = {
            schemaName: 'rateFormData',
            schemaVersion: 0,

            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2022-03-01',
            rateDateEnd: '2022-03-02',
            amendmentDateStart: '2023-01-01',
        }

        console.log('ra0', rav0)
        console.log('rn0', rnv0)


        const rateEncode = IORateFormDataV0.encode(rav0)

        console.log('ENCODED', rateEncode)

        const parsed = IORateFormDataV0.decode(badrav0)

        console.log('Parsed: ', PathReporter.report(parsed))


        const realDates: IORateFormDataTypeV1= {
            schemaName: 'rateFormData',
            schemaVersion: 1,

            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2021-02-01',
            rateDateEnd: '2022-03-02',
            exactStartDate: new Date(),
        }

        console.log('rea dates', realDates)

        const readDateEncode = IORateFormDataV1.encode(realDates)

        const realDateString = JSON.stringify(readDateEncode)


        console.log('ENCODED', realDateString)

        const readDateJSONUp = JSON.parse(realDateString)

        const readDateAgain = IORateFormDataV1.decode(readDateJSONUp)

        console.log('decoded real date', readDateAgain)


        // Unlocked??



        expect(true).toBe(false)        
    })

    it('can deal with some versions', async () => {

        const av0: ZodContractFormDataTypeV0 = {
            schemaName: 'contractFormData',
            schemaVersion: 0,

            contractDescription: 'The first version of a contract',
            startDate: '2022-01-01',
            endDate: '2023-01-01',
            submissionType: 'CONTRACT_ONLY',
        }

        console.log('av0', av0)


        const av1: ZodContractFormDataTypeV1 = {
            schemaName: 'contractFormData',
            schemaVersion: 1,

            contractDescription: 'The first version of a contract',
            startDate: '2022-01-01',
            endDate: '2023-01-01',
            submissionType: 'CONTRACT_ONLY',
            federalAuthorities: ['WAIVER_1915B', 'STATE_PLAN']
        }

        console.log('av1', av1)

        const av2: ZodContractFormDataTypeV2 = {
            schemaName: 'contractFormData',
            schemaVersion: 2,

            contractDescription: 'The first version of a contract',
            startDate: '2022-01-01',
            endDate: '2023-01-01',
            submissionType: 'CONTRACT_ONLY',
            federalAuthorities: ['WAIVER_1915B', 'STATE_PLAN'],
            modifiedProvisions: {
                modifiedGeoAreaServed: true,
                modifiedRiskSharingStrategy: false,
            }
        }

        console.log('av2', av2)

        const avbad: any = {
            schemaName: 'contractFormData',
            schemaVersion: 1,

            contractDescription: 'The first version of a contract',
            startDate: 1,
            endDate: '2023-01-01',
            submissionType: 'CONTRACT_ONLY',
        }

        const av0json = JSON.stringify(av2)

        const somea = ZodContractFormDataVAll.safeParse(JSON.parse(av0json))
        console.log("WHAT", somea)

        if (!somea.success) {
            throw new Error('foobar')
        }

        const a = somea.data

        if ('federalAuthorities' in a) {
            console.log('VERSION IS 1', a.schemaVersion)
        }

        if (a.schemaVersion === 1) {
            console.log('weve got feds', a.federalAuthorities)
        }


        const unlocked = ZodDraftContractFormData.safeParse(JSON.parse(av0json))
        console.log('unlocked!', unlocked)
        if (!unlocked.success) {
            throw new Error("this should work.")
        }

        const unlockedFormData = unlocked.data

        const lockedBad = ZodContractFormDataVCurrent.safeParse(unlockedFormData)

        console.log("this better fail", lockedBad)
        if (lockedBad.success) {
            throw new Error('dont work.')
        }

        if (!unlockedFormData.modifiedProvisions) {
            throw new Error('huh, that changed...')
        }

        unlockedFormData.modifiedProvisions.modifiedPassThroughPayments = false

        const lockedGood = ZodContractFormDataVCurrent.safeParse(unlockedFormData)

        console.log('Submitted', lockedGood)


        // real dates

        // scenario 
        // make av1.draft
        // save av1.draft
        // submit av1 -> locked
        // save av1.locked
        // make new bv1.draft
        // save bv1.draft
        // make cv2.draft
        // save cv2.draft
        // load bv1.draft -> bv2.draft?  // everything is optional? So we just load it. // strip extra fields?
        // save bv2.draft
        // submit bv2 -> locked
        // submit cv2 -> locked
        // load av1.locked
        // load bv2.locked


        expect(true).toBe(false)

    })


    it('can insert some data into the tables', async () => {
        // this test attempts to create a number of drafts concurrently.
        // if any of the state numbers in the resultant drafts are duplicates, we have a bug.

        const client = await sharedTestPrismaClient()

        // const rate0_1 = await client.rateRevisionTable.create({data: {id: uuidv4(), rateID: rate0.id, name: '0.1', rateCertURL: 'someurle.en'}})

        // const contractA_1 = await client.contractRevisionTable.create({ data: { id: uuidv4(), contractID: contractA.id, name: 'A.1', contractDescription: 'something else' }})


        // SCNEARIO
        // Create a new submission A (DRAFT) (incomplete)
        const contractA = await client.contractTable.create({ data: { id: uuidv4() }})
        const contractA_0 = await client.contractRevisionTable.create({ 
            data: { 
                id: uuidv4(), 
                contract: {
                    connect: {
                        id: contractA.id,
                    }
                }, 
                name: 'A.0',
                draftFormData: {
                    create: {
                        id: uuidv4(),
                    }
                }
            }
        })
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
                draftFormData: true,
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
            contractDescription:  draftPackageRevisionTable.draftFormData.contractDescription || undefined,

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

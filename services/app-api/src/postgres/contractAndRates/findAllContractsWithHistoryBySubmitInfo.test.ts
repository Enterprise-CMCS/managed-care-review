import { findAllContractsWithHistoryBySubmitInfo } from './findAllContractsWithHistoryBySubmitInfo'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { mockInsertContractArgs, must } from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftContract } from './insertContract'
import { submitContract } from './submitContract'
import { unlockContract } from './unlockContract'

describe('findAllContractsWithHistoryBySubmittedInfo', () => {
    it('returns only contracts that have been submitted or unlocked', async () => {
        const client = await sharedTestPrismaClient()
        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })

        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })

        // make two submitted contracts and submit them
        const contractOne = must(
            await insertDraftContract(client, draftContractData)
        )
        const contractTwo = must(
            await insertDraftContract(client, draftContractData)
        )
        const submittedContractOne = must(
            await submitContract(client, {
                contractID: contractOne.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'contractOne submit',
            })
        )
        const submittedContractTwo = must(
            await submitContract(client, {
                contractID: contractTwo.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'contractTwo submit',
            })
        )

        // make two draft contracts
        const draftContractOne = must(
            await insertDraftContract(client, draftContractData)
        )
        const draftContractTwo = must(
            await insertDraftContract(client, draftContractData)
        )

        // make one unlocked contract
        const contractThree = must(
            await insertDraftContract(client, draftContractData)
        )
        must(
            await submitContract(client, {
                contractID: contractThree.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'unlockContractOne submit',
            })
        )
        const unlockedContract = must(
            await unlockContract(client, {
                contractID: contractThree.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock unlockContractOne',
            })
        )

        // call the find by submit info function
        const contracts = must(
            await findAllContractsWithHistoryBySubmitInfo(client)
        )

        // expect our two submitted contracts
        expect(contracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contractID: submittedContractOne.id,
                }),
                expect.objectContaining({
                    contractID: submittedContractTwo.id,
                }),
            ])
        )

        // expect our one unlocked contract
        expect(contracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contractID: unlockedContract.id,
                }),
            ])
        )

        // expect our two draft contracts to not be in the results
        expect(contracts).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contractID: draftContractOne.id,
                }),
                expect.objectContaining({
                    contractID: draftContractTwo.id,
                }),
            ])
        )
    })
})

describe('findAllContractsWithHistoryBySubmitInfo - with query params', () => {
    it('adds latestQuestionCreatedAt when a contract question exists', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Toph',
                familyName: 'Beifong',
                email: 'toph@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draft = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'contract w/ question',
                })
            )
        )

        const submitted = must(
            await submitContract(client, {
                contractID: draft.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit',
            })
        )

        // Create a contract question for this contract
        const createdAt = new Date('2024-04-01T10:00:00.000Z')
        await client.contractQuestion.create({
            data: {
                contract: { connect: { id: submitted.id } },
                addedBy: { connect: { id: stateUser.id } },
                division: 'DMCO',
                createdAt,
                documents: {
                    create: [
                        {
                            name: 'contractQuestion.pdf',
                            s3URL: 's3://bucket/contractQuestion.pdf',
                        },
                    ],
                },
            },
        })

        const results = must(
            await findAllContractsWithHistoryBySubmitInfo(client, true, false)
        )
        const found = results.find((r) => r.contractID === submitted.id)
        expect(found).toBeDefined()
        expect(found?.contract instanceof Error).toBe(false)

        const latest = (found!.contract as any).latestQuestionCreatedAt as
            | Date
            | undefined
        expect(latest).toBeDefined()
        expect(new Date(latest!).getTime()).toEqual(createdAt.getTime())
    })

    it('adds latestQuestionResponseCreatedAt when a contract question response exists', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Katara',
                familyName: 'Water',
                email: 'katara@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draft = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'contract w/ response',
                })
            )
        )

        const submitted = must(
            await submitContract(client, {
                contractID: draft.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit',
            })
        )

        // Make a question, then a response
        const q = await client.contractQuestion.create({
            data: {
                contract: { connect: { id: submitted.id } },
                addedBy: { connect: { id: stateUser.id } },
                division: 'DMCO',
                documents: {
                    create: [{ name: 'q.pdf', s3URL: 's3://bucket/q.pdf' }],
                },
            },
        })

        const responseCreatedAt = new Date('2024-05-02T12:34:56.000Z')
        await client.contractQuestionResponse.create({
            data: {
                question: { connect: { id: q.id } },
                addedBy: { connect: { id: stateUser.id } },
                createdAt: responseCreatedAt,
                documents: {
                    create: [
                        { name: 'resp.pdf', s3URL: 's3://bucket/resp.pdf' },
                    ],
                },
            },
        })

        const results = must(
            await findAllContractsWithHistoryBySubmitInfo(client, true, false)
        )
        const found = results.find((r) => r.contractID === submitted.id)
        expect(found).toBeDefined()
        expect(found?.contract instanceof Error).toBe(false)

        const latest = (found!.contract as any)
            .latestQuestionResponseCreatedAt as Date | undefined
        expect(latest).toBeDefined()
        expect(new Date(latest!).getTime()).toEqual(responseCreatedAt.getTime())
    })

    it('adds latestRateQuestionCreatedAt for a related rate (using draft link)', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Sokka',
                familyName: 'Boomerang',
                email: 'sokka@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draft = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'contract linked to rate',
                })
            )
        )

        const submitted = must(
            await submitContract(client, {
                contractID: draft.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit',
            })
        )

        // Create a rate and link it to the contract via DraftRateJoinTable
        const rate = await client.rateTable.create({
            data: {
                stateCode: 'NM',
                stateNumber: 1,
            },
        })

        await client.draftRateJoinTable.create({
            data: {
                contractID: submitted.id,
                rateID: rate.id,
                ratePosition: 0,
            },
        })

        const rqCreatedAt = new Date('2024-06-15T09:00:00.000Z')
        await client.rateQuestion.create({
            data: {
                rate: { connect: { id: rate.id } },
                addedBy: { connect: { id: stateUser.id } },
                division: 'OACT',
                createdAt: rqCreatedAt,
                documents: {
                    create: [{ name: 'rq.pdf', s3URL: 's3://bucket/rq.pdf' }],
                },
            },
        })

        const results = must(
            await findAllContractsWithHistoryBySubmitInfo(client, true, false)
        )
        const found = results.find((r) => r.contractID === submitted.id)
        expect(found).toBeDefined()
        expect(found?.contract instanceof Error).toBe(false)

        const latest = (found!.contract as any).latestRateQuestionCreatedAt as
            | Date
            | undefined
        expect(latest).toBeDefined()
        expect(new Date(latest!).getTime()).toEqual(rqCreatedAt.getTime())
    })

    it('adds latestRateQuestionResponseCreatedAt for a related rate', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Iroh',
                familyName: 'Tea',
                email: 'iroh@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draft = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription:
                        'contract linked to rate w/ response',
                })
            )
        )

        const submitted = must(
            await submitContract(client, {
                contractID: draft.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit',
            })
        )

        const rate = await client.rateTable.create({
            data: {
                stateCode: 'NM',
                stateNumber: 2,
            },
        })

        await client.draftRateJoinTable.create({
            data: {
                contractID: submitted.id,
                rateID: rate.id,
                ratePosition: 0,
            },
        })

        const rq = await client.rateQuestion.create({
            data: {
                rate: { connect: { id: rate.id } },
                addedBy: { connect: { id: stateUser.id } },
                division: 'DMCP',
                documents: {
                    create: [{ name: 'rq.pdf', s3URL: 's3://bucket/rq.pdf' }],
                },
            },
        })

        const rrCreatedAt = new Date('2024-07-10T14:20:00.000Z')
        await client.rateQuestionResponse.create({
            data: {
                question: { connect: { id: rq.id } },
                addedBy: { connect: { id: stateUser.id } },
                createdAt: rrCreatedAt,
                documents: {
                    create: [
                        { name: 'rresp.pdf', s3URL: 's3://bucket/rresp.pdf' },
                    ],
                },
            },
        })

        const results = must(
            await findAllContractsWithHistoryBySubmitInfo(client, true, false)
        )
        const found = results.find((r) => r.contractID === submitted.id)
        expect(found).toBeDefined()
        expect(found?.contract instanceof Error).toBe(false)

        const latest = (found!.contract as any)
            .latestRateQuestionResponseCreatedAt as Date | undefined
        expect(latest).toBeDefined()
        expect(new Date(latest!).getTime()).toEqual(rrCreatedAt.getTime())
    })

    it('adds latestLinkedRateSubmitUpdatedAt when a related rate has a submitted revision', async () => {
        const client = await sharedTestPrismaClient()

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Azula',
                familyName: 'Fire',
                email: 'azula@example.com',
                role: 'CMS_USER',
            },
        })
        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Suki',
                familyName: 'Kyoshi',
                email: 'suki@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draft = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'contract linked rate submit',
                })
            )
        )

        const submitted = must(
            await submitContract(client, {
                contractID: draft.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit',
            })
        )

        // Create a rate and link to contract
        const rate = await client.rateTable.create({
            data: {
                stateCode: 'NM',
                stateNumber: 3,
            },
        })
        await client.draftRateJoinTable.create({
            data: {
                contractID: submitted.id,
                rateID: rate.id,
                ratePosition: 0,
            },
        })

        // Create an UpdateInfo (submitInfo) and a submitted rate revision referencing it
        const submitInfo = await client.updateInfoTable.create({
            data: {
                updatedAt: new Date('2024-08-01T08:00:00.000Z'),
                updatedBy: { connect: { id: cmsUser.id } },
                updatedReason: 'rate submit',
            },
        })

        await client.rateRevisionTable.create({
            data: {
                rate: { connect: { id: rate.id } },
                submitInfo: { connect: { id: submitInfo.id } },
            },
        })

        const results = must(
            await findAllContractsWithHistoryBySubmitInfo(client, true, false)
        )
        const found = results.find((r) => r.contractID === submitted.id)
        expect(found).toBeDefined()
        expect(found?.contract instanceof Error).toBe(false)

        const latest = (found!.contract as any)
            .latestLinkedRateSubmitUpdatedAt as Date | undefined
        expect(latest).toBeDefined()
        expect(new Date(latest!).getTime()).toEqual(
            new Date('2024-08-01T08:00:00.000Z').getTime()
        )
    })

    it('skips extra processing when skipFindingLatest = true', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zhao',
                familyName: 'Admiral',
                email: 'zhao@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const draft = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({ submissionDescription: 'skip extras' })
            )
        )

        const submitted = must(
            await submitContract(client, {
                contractID: draft.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit',
            })
        )

        const results = must(
            await findAllContractsWithHistoryBySubmitInfo(client, true, true) // skipFindingLatest = true
        )
        const found = results.find((r) => r.contractID === submitted.id)
        expect(found).toBeDefined()
        expect(found?.contract instanceof Error).toBe(false)

        const augmented = found!.contract as any
        expect(augmented.latestQuestionCreatedAt).toBeUndefined()
        expect(augmented.latestRateQuestionCreatedAt).toBeUndefined()
        expect(augmented.latestLinkedRateSubmitUpdatedAt).toBeUndefined()
        expect(augmented.latestQuestionResponseCreatedAt).toBeUndefined()
        expect(augmented.latestRateQuestionResponseCreatedAt).toBeUndefined()
    })
})

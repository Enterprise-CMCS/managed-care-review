import {
    iterableNonCMSUsersMockData,
    testCMSUser,
    testStateUser,
    createDBUsersWithFullData,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
} from '../../testHelpers/gqlHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    fetchTestContractWithQuestions,
    submitTestContract,
    unlockTestContract,
    unlockTestContractAsUser,
    withdrawTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    addNewRateToTestContract,
    fetchTestRateById,
    withdrawTestRate,
} from '../../testHelpers/gqlRateHelpers'
import {
    WithdrawRateDocument,
    UpdateDraftContractRatesDocument,
    UnlockContractDocument,
    SubmitContractDocument,
    type RateFormDataInput,
} from '../../gen/gqlClient'
import {
    mockStoreThatErrors,
    sharedTestPrismaClient,
} from '../../testHelpers/storeHelpers'
import { expect } from 'vitest'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { packageName } from '@mc-review/hpp/build/healthPlanFormDataType/healthPlanFormData'
import { must } from '../../testHelpers'

const testRateFormInputData = (): RateFormDataInput => ({
    rateType: 'AMENDMENT',
    rateCapitationType: 'RATE_CELL',
    rateDateStart: '2024-01-01',
    rateDateEnd: '2025-01-01',
    rateDateCertified: '2024-01-01',
    amendmentEffectiveDateStart: '2024-02-01',
    amendmentEffectiveDateEnd: '2025-02-01',
    rateProgramIDs: [defaultFloridaProgram().id],
    deprecatedRateProgramIDs: [],
    rateMedicaidPopulations: ['MEDICARE_MEDICAID_WITHOUT_DSNP'],
    rateDocuments: [
        {
            s3URL: 's3://bucketname/key/test1',
            name: 'updatedratedoc1.doc',
            sha256: 'foobar',
        },
    ],
    supportingDocuments: [],
    certifyingActuaryContacts: [
        {
            name: 'Foo Person',
            titleRole: 'Bar Job',
            email: 'foo@example.com',
            actuarialFirm: 'GUIDEHOUSE',
        },
    ],
    addtlActuaryContacts: [],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
})

describe('withdrawRate', () => {
    const stateUser = testStateUser()
    const cmsUser = testCMSUser()

    beforeAll(async () => {
        await createDBUsersWithFullData([stateUser, cmsUser])
    })

    it('can withdraw a rate without errors', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rate = contract.packageSubmissions[0].rateRevisions[0]
        const rateID = rate.rateID
        const rateName = rate.formData.rateCertificationName
        const updatedReason = 'Withdraw invalid rate'

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            updatedReason,
            { user: cmsUser }
        )

        // expect rate to contain contract in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(1)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contract.id,
                }),
            ])
        )

        // expect withdrawn status
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        // expect correct actions
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const latestRateRev = withdrawnRate.packageSubmissions[0].rateRevision
        const rateUnlockInfo = latestRateRev.unlockInfo
        const rateSubmitInfo = latestRateRev.submitInfo

        // expect the rate latest unlock info to contain default text and withdraw reason
        expect(rateUnlockInfo?.updatedReason).toBe(
            `CMS withdrawing rate ${rateName} from this submission. ${updatedReason}`
        )

        // expect rate latest submission to contain default text and withdraw reason
        expect(rateSubmitInfo?.updatedReason).toBe(
            `CMS has withdrawn this rate. ${updatedReason}`
        )

        const contractWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        expect(contractWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract to be RESUBMITTED
        expect(contractWithWithdrawnRate.consolidatedStatus).toEqual(
            'RESUBMITTED'
        )

        // expect contract to contain the withdrawn rate
        expect(contractWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const packageSubmissions = contractWithWithdrawnRate.packageSubmissions
        const contractSubmitInfo =
            packageSubmissions[0].contractRevision.submitInfo
        const contractUnlockInfo =
            packageSubmissions[0].contractRevision.unlockInfo

        // expect withdrawn rate is no longer in latest package submission
        expect(packageSubmissions[0].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the contacts latest unlock info to contain default text and withdraw reason
        expect(contractUnlockInfo?.updatedReason).toBe(
            `CMS withdrawing rate ${rateName} from this submission. ${updatedReason}`
        )

        // expect contracts latest submission to contain default text and withdraw reason
        expect(contractSubmitInfo?.updatedReason).toBe(
            `CMS has withdrawn rate ${rateName} from this submission. ${updatedReason}`
        )

        // expect the withdrawn rate is on the previous packageSubmission
        expect(packageSubmissions[1].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )
    })

    // No known path exists for a child rate to be submitted while its parent contract is withdrawn.
    // However, we allow rate withdrawal in this edge case so CMS can fix rates without valid parent
    // contracts, which warrants testing.
    it('can withdraw a rate when parent contract is withdrawn', async () => {
        const client = await sharedTestPrismaClient()
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rate = contract.packageSubmissions[0].rateRevisions[0]
        const rateID = rate.rateID
        const rateName = rate.formData.rateCertificationName
        const updatedReason = 'Withdraw invalid rate'

        // To get into this state we manually add a review action, outside our regular methods in the API
        await client.contractTable.update({
            where: {
                id: contract.id,
            },
            data: {
                reviewStatusActions: {
                    create: {
                        updatedByID: cmsUser.id,
                        updatedReason: 'Withdrawing contractC',
                        actionType: 'WITHDRAW',
                    },
                },
            },
        })

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            updatedReason,
            { user: cmsUser }
        )

        // expect rate to contain contract in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(1)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contract.id,
                }),
            ])
        )

        // expect withdrawn status
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        // expect correct actions
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const latestRateRev = withdrawnRate.packageSubmissions[0].rateRevision
        const rateUnlockInfo = latestRateRev.unlockInfo
        const rateSubmitInfo = latestRateRev.submitInfo

        // expect the rate latest unlock info to contain default text and withdraw reason
        expect(rateUnlockInfo?.updatedReason).toBe(
            `CMS withdrawing rate ${rateName} from this submission. ${updatedReason}`
        )

        // expect rate latest submission to contain default text and withdraw reason
        expect(rateSubmitInfo?.updatedReason).toBe(
            `CMS has withdrawn this rate. ${updatedReason}`
        )

        const contractWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        expect(contractWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract to be WITHDRAWN
        expect(contractWithWithdrawnRate.consolidatedStatus).toEqual(
            'WITHDRAWN'
        )

        // expect contract to contain the withdrawn rate
        expect(contractWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const packageSubmissions = contractWithWithdrawnRate.packageSubmissions
        const contractSubmitInfo =
            packageSubmissions[0].contractRevision.submitInfo
        const contractUnlockInfo =
            packageSubmissions[0].contractRevision.unlockInfo

        // expect withdrawn rate is no longer in latest package submission
        expect(packageSubmissions[0].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the contacts latest unlock info to contain default text and withdraw reason
        expect(contractUnlockInfo?.updatedReason).toBe(
            `CMS withdrawing rate ${rateName} from this submission. ${updatedReason}`
        )

        // expect contracts latest submission to contain default text and withdraw reason
        expect(contractSubmitInfo?.updatedReason).toBe(
            `CMS has withdrawn rate ${rateName} from this submission. ${updatedReason}`
        )

        // expect the withdrawn rate is on the previous packageSubmission
        expect(packageSubmissions[1].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )
    })

    it('can withdraw with a multiple rates in a contract', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const contract = await createAndUpdateTestContractWithRate(stateServer)
        const rate = contract.draftRates?.[0]
        if (!rate) {
            throw new Error('Expected rate to be defined')
        }

        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contract.id,
                            lastSeenUpdatedAt:
                                contract.draftRevision?.updatedAt,
                            updatedRates: [
                                {
                                    type: 'UPDATE',
                                    rateID: rate.id,
                                    formData: testRateFormInputData(),
                                },
                                {
                                    type: 'CREATE',
                                    formData: testRateFormInputData(),
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        const submittedContract = await submitTestContract(
            stateServer,
            contract.id,
            undefined,
            { user: stateUser }
        )

        // expect two submitted rates
        expect(
            submittedContract.packageSubmissions[0].rateRevisions
        ).toHaveLength(2)
        const rateAID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID
        const rateBID =
            submittedContract.packageSubmissions[0].rateRevisions[1].rateID

        // withdraw the first rate
        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateAID,
            'Withdraw invalid rate',
            { user: cmsUser }
        )

        // expect rate to contain contract in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(1)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contract.id,
                }),
            ])
        )

        const contractWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )

        expect(contractWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract to be RESUBMITTED
        expect(contractWithWithdrawnRate.consolidatedStatus).toEqual(
            'RESUBMITTED'
        )

        // expect contract to contain the withdrawn rate
        expect(contractWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateAID,
                }),
            ])
        )

        const packageSubmissions = contractWithWithdrawnRate.packageSubmissions

        // expect withdrawn rate is no longer in latest package submission
        expect(packageSubmissions[0].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: rateAID,
                }),
            ])
        )

        // expect rateB to be in the latest submission
        expect(packageSubmissions[0].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID: rateBID,
                }),
            ])
        )
    })

    it('can still unlock and resubmit after a rate has been withdrawn with expected packageSubmissions', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draft = await createAndUpdateTestContractWithRate(stateServer)
        const draftWithExtraRate = await addNewRateToTestContract(
            stateServer,
            draft
        )
        const contract = await submitTestContract(
            stateServer,
            draftWithExtraRate.id,
            undefined,
            { user: stateUser }
        )

        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID
        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate', {
            user: cmsUser,
        })

        must(
            await cmsServer.executeOperation(
                {
                    query: UnlockContractDocument,
                    variables: {
                        input: {
                            contractID: contract.id,
                            unlockedReason:
                                'Test unlock after withdrawing rate',
                        },
                    },
                },
                {
                    contextValue: { user: cmsUser },
                }
            )
        )

        const resubmitContractResponse = await stateServer.executeOperation(
            {
                query: SubmitContractDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                        submittedReason: 'Resubmit contract',
                    },
                },
            },
            {
                contextValue: { user: stateUser },
            }
        )

        const resubmitContractResult = extractGraphQLResponse(
            resubmitContractResponse
        )

        if (resubmitContractResult.errors) {
            throw new Error(
                `resubmitContract mutation failed with errors ${JSON.stringify(resubmitContractResult.errors)}`
            )
        }

        if (!resubmitContractResult.data) {
            throw new Error('resubmitContract returned nothing')
        }

        // expect withdrawn rate to still be in the withdrawn rate join table
        const resubmittedContract =
            resubmitContractResult.data.submitContract.contract
        expect(resubmittedContract.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const packageSubmissions = resubmittedContract.packageSubmissions

        // expect withdrawn rate to be in the latest packageSubmissions.
        expect(packageSubmissions[0].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the withdrawn rate is not on the previous packageSubmission
        expect(packageSubmissions[1].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the withdrawn rate to be on the packageSubmission before the withdraw
        expect(packageSubmissions[2].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )
    })

    it('withdraws rate when linked to other multi-rate contracts', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contractA = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate to contract B
        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contractB.id,
                            lastSeenUpdatedAt:
                                contractB.draftRevision?.updatedAt,
                            updatedRates: [
                                {
                                    type: 'LINK',
                                    rateID: rateID,
                                },
                                {
                                    type: 'CREATE',
                                    formData: testRateFormInputData(),
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        const submittedContractB = await submitTestContract(
            stateServer,
            contractB.id,
            undefined,
            { user: stateUser }
        )

        // expect contract B to be submitted before we withdraw rate
        expect(submittedContractB.status).toBe('SUBMITTED')

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate',
            { user: cmsUser }
        )

        // expect rate to contain both contracts in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(2)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractB.id,
                }),
                expect.objectContaining({
                    id: contractA.id,
                }),
            ])
        )

        // expect review status action to be WITHDRAW
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const contractAWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractA.id
        )
        expect(contractAWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract A to contain the withdrawn rate
        expect(contractAWithWithdrawnRate?.withdrawnRates).toHaveLength(1)
        expect(contractAWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const contractBWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractB.id
        )
        expect(contractBWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract B to contain the withdrawn rate
        expect(contractBWithWithdrawnRate?.withdrawnRates).toHaveLength(1)
        expect(contractBWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )
    })

    it('withdraws rate when linked to withdrawn contract', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contractA = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate to contract B and add another rate to meet requirements
        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contractB.id,
                            lastSeenUpdatedAt:
                                contractB.draftRevision?.updatedAt,
                            updatedRates: [
                                {
                                    type: 'LINK',
                                    rateID: rateID,
                                },
                                {
                                    type: 'CREATE',
                                    formData: testRateFormInputData(),
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        const submittedContractB = await submitTestContract(
            stateServer,
            contractB.id,
            undefined,
            { user: stateUser }
        )

        // expect contract B to be submitted before we withdraw rate
        expect(submittedContractB.status).toBe('SUBMITTED')

        // withdraw contract A
        await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A',
            { user: cmsUser }
        )

        // expect rateA to have a new parent contract B
        const rateA = await fetchTestRateById(cmsServer, rateID)
        expect(rateA.parentContractID).toBe(contractB.id)

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate',
            { user: cmsUser }
        )

        // expect rate to contain both contracts in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(2)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractB.id,
                }),
                expect.objectContaining({
                    id: contractA.id,
                }),
            ])
        )

        // expect review status action to be WITHDRAW
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const contractAWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractA.id
        )
        expect(contractAWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract A to contain the withdrawn rate
        expect(contractAWithWithdrawnRate?.withdrawnRates).toHaveLength(1)
        expect(contractAWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const contractBWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractB.id
        )
        expect(contractBWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract B to contain the withdrawn rate
        expect(contractBWithWithdrawnRate?.withdrawnRates).toHaveLength(1)
        expect(contractBWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )
    })

    it('removes rate from DRAFT and UNLOCKED contracts linked to rate', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // contractA is parent contract and submitted
        const contractA = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        // contract B is linked and in draft
        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // contract C is linked, submitted, then unlocked
        const contractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // contract D is submitted, unlocked, then linked
        const contractD = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )

        // link rate to contract B and add another rate to meet requirements
        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contractB.id,
                            lastSeenUpdatedAt:
                                contractB.draftRevision?.updatedAt,
                            updatedRates: [
                                {
                                    type: 'LINK',
                                    rateID: rateID,
                                },
                                {
                                    type: 'CREATE',
                                    formData: testRateFormInputData(),
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        // link rate to contract C, submit, unlock, then update child rate
        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contractC.id,
                            lastSeenUpdatedAt:
                                contractC.draftRevision?.updatedAt,
                            updatedRates: [
                                {
                                    type: 'LINK',
                                    rateID: rateID,
                                },
                                {
                                    type: 'CREATE',
                                    formData: testRateFormInputData(),
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        const submittedContractC = await submitTestContract(
            stateServer,
            contractC.id,
            undefined,
            { user: stateUser }
        )
        const newContractCRate =
            submittedContractC.packageSubmissions[0].rateRevisions.find(
                (rev) => rev.rateID !== rateID
            )
        if (!newContractCRate) {
            throw new Error('Expected contract C child rate to be defined')
        }

        const unlockContractC = await unlockTestContract(
            cmsServer,
            contractC.id,
            'unlock to make updates',
            { user: cmsUser }
        )

        // update contract C child rate to assert it wasn't modified
        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contractC.id,
                            lastSeenUpdatedAt:
                                unlockContractC.draftRevision.updatedAt,
                            updatedRates: [
                                {
                                    type: 'LINK',
                                    rateID: rateID,
                                },
                                {
                                    type: 'UPDATE',
                                    rateID: newContractCRate.rateID,
                                    formData: {
                                        rateType: 'AMENDMENT',
                                        rateDocuments: [],
                                        supportingDocuments: [],
                                        certifyingActuaryContacts: [],
                                        deprecatedRateProgramIDs: [],
                                        rateProgramIDs: [],
                                    },
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        // submit unlock contractD, then link rate
        await unlockTestContract(
            cmsServer,
            contractD.id,
            'unlock to make updates',
            { user: cmsUser }
        )
        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: contractD.id,
                        lastSeenUpdatedAt: contractD.draftRevision?.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateID,
                            },
                        ],
                    },
                },
            })
        )

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate',
            { user: cmsUser }
        )

        // expect withdrawn rate to contain contractA and contractC in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(2)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractA.id,
                }),
                expect.objectContaining({
                    id: contractC.id,
                }),
            ])
        )

        // expect withdrawn rate to not contain DRAFT contractB and Unlocked contractD.
        // Both contracts were never submitted with the rate before it was withdrawn.
        expect(withdrawnRate.withdrawnFromContracts).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractB.id,
                }),
                expect.objectContaining({
                    id: contractD.id,
                }),
            ])
        )

        // expect withdrawn status
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        // expect correct actions
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const contractBResult = await fetchTestContractWithQuestions(
            stateServer,
            contractB.id
        )

        // expect no withdrawn rates, since rate was never submitted with this contract before the withdraw
        expect(contractBResult.withdrawnRates).toHaveLength(0)

        // expect contract B to still be DRAFT
        expect(contractBResult.consolidatedStatus).toEqual('DRAFT')

        // expect contract B to not contain withdrawn rate in DraftRates
        expect(contractBResult.draftRates).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                    consolidatedStatus: 'WITHDRAWN',
                }),
            ])
        )

        const contractCResult = await fetchTestContractWithQuestions(
            stateServer,
            contractC.id
        )

        // expect contract C to contain the withdrawn rate, since it had been submitted with this
        expect(contractCResult.withdrawnRates).toHaveLength(1)

        expect(contractCResult.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                    consolidatedStatus: 'WITHDRAWN',
                }),
            ])
        )

        // expect contract C to still be UNLOCKED
        expect(contractCResult.consolidatedStatus).toEqual('UNLOCKED')

        //expect contract C to not contain withdrawn rate in DraftRates
        expect(contractCResult.draftRates).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                    consolidatedStatus: 'WITHDRAWN',
                }),
            ])
        )

        // expect contractC draft child rate to not be modified
        const contractCdraftRateFormData =
            contractCResult.draftRates?.[0].draftRevision?.formData

        if (!contractCdraftRateFormData) {
            throw new Error('Contract C child rate not found')
        }

        expect(contractCdraftRateFormData.rateType).toBe('AMENDMENT')

        const contractDResult = await fetchTestContractWithQuestions(
            stateServer,
            contractD.id
        )

        // expect no withdrawn rates, since rate was never submitted with this contract before the withdraw
        expect(contractDResult.withdrawnRates).toHaveLength(0)

        // expect contract D to still be UNLOCKED
        expect(contractDResult.consolidatedStatus).toEqual('UNLOCKED')

        // expect contract D to not contain withdrawn rate in DraftRates
        expect(contractDResult.draftRates).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                    consolidatedStatus: 'WITHDRAWN',
                }),
            ])
        )
    })

    it('sends emails to state and CMS when a rate is withdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer(emailConfig)
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const contractA = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID
        const rateName =
            contractA.packageSubmissions[0].rateRevisions[0].formData
                .rateCertificationName
        const contractAName = packageName(
            contractA.stateCode,
            contractA.stateNumber,
            contractA.packageSubmissions[0].contractRevision.formData
                .programIDs,
            [defaultFloridaProgram()]
        )

        // contractB is a linked contract that included the rate in its last submission before the rate was withdrawn
        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        must(
            await stateServer.executeOperation(
                {
                    query: UpdateDraftContractRatesDocument,
                    variables: {
                        input: {
                            contractID: contractB.id,
                            lastSeenUpdatedAt:
                                contractB.draftRevision?.updatedAt,
                            updatedRates: [
                                {
                                    type: 'LINK',
                                    rateID: rateID,
                                },
                                {
                                    type: 'CREATE',
                                    formData: testRateFormInputData(),
                                },
                            ],
                        },
                    },
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )
        const submittedContractB = await submitTestContract(
            stateServer,
            contractB.id,
            undefined,
            { user: stateUser }
        )
        await unlockTestContract(
            cmsServer,
            contractB.id,
            'unlock to make updates',
            { user: cmsUser }
        )

        const contractBName = packageName(
            submittedContractB.stateCode,
            submittedContractB.stateNumber,
            submittedContractB.packageSubmissions[0].contractRevision.formData
                .programIDs,
            [defaultFloridaProgram()]
        )

        const stateReceiverEmails =
            contractA.packageSubmissions[0].contractRevision.formData.stateContacts.map(
                (contact) => contact.email
            )

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate', {
            user: cmsUser,
        })

        // expect CMS email to contain correct subject
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                subject: expect.stringContaining(`${rateName} was withdrawn`),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().dmcpSubmissionEmails,
                    ...testEmailConfig().oactEmails,
                ]),
                bodyHTML: expect.stringContaining(contractAName),
            })
        )

        // expect contract B to be in the CMS email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractBName),
            })
        )

        // expect state email to contain correct subject
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
                subject: expect.stringContaining(`${rateName} was withdrawn`),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(stateReceiverEmails),
                bodyHTML: expect.stringContaining(contractAName),
            })
        )

        // expect contract B to be in the state email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractBName),
            })
        )
    })
})

describe('withdrawRate invalid status handling', () => {
    it("returns error if rate is in invalid status' to withdraw", async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)

        const rateID = draftContract.draftRates?.[0].id as string
        const contractID = draftContract.id

        const response = await cmsServer.executeOperation(
            {
                query: WithdrawRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'Withdraw draft rate',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const failedWithdrawDraftRate = extractGraphQLResponse(response)

        // expect error for attempting to withdraw a draft rate
        expect(failedWithdrawDraftRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawDraftRate.errors?.[0].message).toBe(
            'Attempted to withdraw rate with wrong status. Rate: DRAFT, Parent contract: DRAFT'
        )

        await submitTestContract(stateServer, contractID, undefined, {
            user: stateUser,
        })
        await unlockTestContractAsUser(
            cmsServer,
            draftContract.id,
            'Unlock contract',
            cmsUser
        )

        const withdrawUnlockedResponse = await cmsServer.executeOperation(
            {
                query: WithdrawRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'Withdraw unlocked rate',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const failedWithdrawUnlockedRate = extractGraphQLResponse(
            withdrawUnlockedResponse
        )

        // expect error for attempting to withdraw an unlocked rate
        expect(failedWithdrawUnlockedRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawUnlockedRate.errors?.[0].message).toBe(
            'Attempted to withdraw rate with wrong status. Rate: UNLOCKED, Parent contract: UNLOCKED'
        )

        await submitTestContract(stateServer, contractID, 'Resubmit', {
            user: stateUser,
        })

        const withdrawResponse = await cmsServer.executeOperation(
            {
                query: WithdrawRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'Withdraw submitted rate',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const withdrawnRateResult = extractGraphQLResponse(withdrawResponse)
        const withdrawnRate = withdrawnRateResult.data?.withdrawRate.rate

        // expect rate to be withdrawn with no errors
        expect(withdrawnRateResult.errors).toBeUndefined()
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        const failedWithdrawWithdrawnRateResponse =
            await cmsServer.executeOperation(
                {
                    query: WithdrawRateDocument,
                    variables: {
                        input: {
                            rateID,
                            updatedReason: 'Withdraw already withdrawn rate',
                        },
                    },
                },
                {
                    contextValue: { user: cmsUser },
                }
            )

        const failedWithdrawWithdrawnRate = extractGraphQLResponse(
            failedWithdrawWithdrawnRateResponse
        )

        // expect error for attempting to withdraw a withdrawn rate
        expect(failedWithdrawWithdrawnRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawWithdrawnRate.errors?.[0].message).toBe(
            'Attempted to withdraw rate with wrong status. Rate: WITHDRAWN, Parent contract: RESUBMITTED'
        )
    })

    it('returns and error when rate is not found', async () => {
        const cmsUser = testCMSUser()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const response = await cmsServer.executeOperation(
            {
                query: WithdrawRateDocument,
                variables: {
                    input: {
                        rateID: 'not-a-valid-rate',
                        updatedReason: 'This rate does not exist',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const failedWithdrawWithdrawnRate = extractGraphQLResponse(response)

        // expect error for attempting to withdraw a rate that is not found
        expect(failedWithdrawWithdrawnRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawWithdrawnRate.errors?.[0].message).toContain(
            'PRISMA ERROR: Cannot find rate with id: not-a-valid-rate'
        )
    })

    it('returns and error when withdraw rate failed in postgres', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            store: {
                withdrawRate: mockStoreThatErrors().withdrawRate,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )
        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID
        const response = await cmsServer.executeOperation(
            {
                query: WithdrawRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'This rate does not exist',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const failedWithdrawWithdrawnRate = extractGraphQLResponse(response)

        // expect error for attempting to withdraw rate in postgres
        expect(failedWithdrawWithdrawnRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawWithdrawnRate.errors?.[0].message).toBe(
            'Failed to withdraw rate message: UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
        )
    })

    it.each(iterableNonCMSUsersMockData)(
        'returns an error when $userRole attempts to withdraw a rate',
        async ({ mockUser }) => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: {
                    user: stateUser,
                },
            })
            const server = await constructTestPostgresServer({
                context: {
                    user: mockUser(),
                },
            })

            const contract = await createAndSubmitTestContractWithRate(
                stateServer,
                undefined,
                { user: stateUser }
            )
            const rateID =
                contract.packageSubmissions[0].rateRevisions[0].rateID

            const response = await server.executeOperation(
                {
                    query: WithdrawRateDocument,
                    variables: {
                        input: {
                            rateID,
                            updatedReason: 'Withdraw draft rate',
                        },
                    },
                },
                {
                    contextValue: { user: mockUser() },
                }
            )

            const failedWithdrawDraftRate = extractGraphQLResponse(response)

            // expect error when withdrawing rate as an unauthorized user.
            expect(failedWithdrawDraftRate.errors?.[0]).toBeDefined()
            expect(failedWithdrawDraftRate.errors?.[0].message).toBe(
                'user not authorized to withdraw a rate'
            )
        }
    )
})

import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
} from '../../testHelpers/gqlHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    fetchTestContract,
    submitTestContract,
    unlockTestContractAsUser,
    contractHistoryToDescriptions,
    withdrawTestContract,
    approveTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    withdrawTestRate,
    undoWithdrawTestRate,
    addNewRateToTestContract,
} from '../../testHelpers/gqlRateHelpers'
import { must } from '../../testHelpers'
import type { RateFormDataInput } from '../../gen/gqlClient'
import {
    UndoWithdrawnRateDocument,
    UpdateDraftContractRatesDocument,
} from '../../gen/gqlClient'
import { describe, expect } from 'vitest'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'

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

describe('undoWithdrawRate', () => {
    it('can undo withdraw a rate without errors', async () => {
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

        //We need to include an extra rate in order to be able to submit
        const draftA = await createAndUpdateTestContractWithRate(stateServer)
        const draftAWithExtraRate = await addNewRateToTestContract(
            stateServer,
            draftA
        )
        const contractA = await submitTestContract(
            stateServer,
            draftAWithExtraRate.id,
            undefined
        )

        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID
        const formData =
            contractA.packageSubmissions[0].rateRevisions[0].formData

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate contract B
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

        await submitTestContract(stateServer, contractB.id, undefined)

        await unlockTestContractAsUser(
            cmsServer,
            contractB.id,
            'unlock to prep for withdraw rate',
            cmsUser
        )

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        await unlockTestContractAsUser(
            cmsServer,
            contractA.id,
            'Unlock after withdraw',
            cmsUser
        )

        await submitTestContract(
            stateServer,
            contractB.id,
            'resubmit after withdrawing rate'
        )

        await submitTestContract(
            stateServer,
            contractA.id,
            'Submit before undo withdraw'
        )

        const unwithdrawnRate = await undoWithdrawTestRate(
            cmsServer,
            rateID,
            'Undo withdraw rate'
        )

        const submittedContractA = await fetchTestContract(
            cmsServer,
            contractA.id
        )
        const submittedContractB = await fetchTestContract(
            cmsServer,
            contractB.id
        )

        // Expect un-withdrawn rate formData to equal formData before it was withdrawn
        expect(
            unwithdrawnRate.packageSubmissions[0].rateRevision.formData
        ).toEqual({
            ...formData,
            rateMedicaidPopulations: [],
            rateDocuments: expect.arrayContaining(
                formData.rateDocuments.map((doc) =>
                    expect.objectContaining({
                        ...doc,
                        id: expect.any(String),
                    })
                )
            ),
            supportingDocuments: expect.arrayContaining(
                formData.supportingDocuments.map((doc) =>
                    expect.objectContaining({
                        ...doc,
                        id: expect.any(String),
                    })
                )
            ),
        })
        expect(unwithdrawnRate.withdrawnFromContracts).toHaveLength(0)
        expect(unwithdrawnRate.consolidatedStatus).toBe('RESUBMITTED')
        expect(unwithdrawnRate.parentContractID).toBe(contractA.id)

        //expect contract A to have rate back
        expect(submittedContractA.withdrawnRates).toHaveLength(0)
        expect(submittedContractA.packageSubmissions[0].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        //expect contract B to have rate back
        expect(submittedContractB.withdrawnRates).toHaveLength(0)
        expect(submittedContractB.packageSubmissions[0].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // Check history
        const contractAHistory =
            contractHistoryToDescriptions(submittedContractA)
        const contractBHistory =
            contractHistoryToDescriptions(submittedContractB)

        // Expect contract A history to be in order
        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `CMS withdrawing rate ${formData.rateCertificationName} from this submission. Withdraw invalid rate`,
                `CMS has withdrawn rate ${formData.rateCertificationName} from this submission. Withdraw invalid rate`,
                'Unlock after withdraw',
                'Submit before undo withdraw',
                `Undo withdrawal of rate ${formData.rateCertificationName} from this submission. Undo withdraw rate`,
                `CMS has changed the status of rate ${formData.rateCertificationName} to submitted. Undo withdraw rate`,
            ])
        )

        // Expect contract B to be in order
        expect(contractBHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'unlock to prep for withdraw rate',
                'resubmit after withdrawing rate',
                `Undo withdrawal of rate ${formData.rateCertificationName} from this submission. Undo withdraw rate`,
                `CMS has changed the status of rate ${formData.rateCertificationName} to submitted. Undo withdraw rate`,
            ])
        )
    })

    it('can undo withdraw a rate previously linked to withdrawn contract', async () => {
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

        //We need to include an extra rate in order to be able to submit
        const draftA = await createAndUpdateTestContractWithRate(stateServer)
        const draftAWithExtraRate = await addNewRateToTestContract(
            stateServer,
            draftA
        )
        const contractA = await submitTestContract(
            stateServer,
            draftAWithExtraRate.id,
            undefined
        )

        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID
        const formData =
            contractA.packageSubmissions[0].rateRevisions[0].formData

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate contract B
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

        await submitTestContract(stateServer, contractB.id, undefined)

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        await unlockTestContractAsUser(
            cmsServer,
            contractA.id,
            'Unlock after withdraw',
            cmsUser
        )

        await submitTestContract(
            stateServer,
            contractA.id,
            'Submit before undo withdraw'
        )

        await withdrawTestContract(
            cmsServer,
            contractB.id,
            'withdraw contractB'
        )

        const unwithdrawnRate = await undoWithdrawTestRate(
            cmsServer,
            rateID,
            'Undo withdraw rate'
        )

        const submittedContractA = await fetchTestContract(
            cmsServer,
            contractA.id
        )
        const submittedContractB = await fetchTestContract(
            cmsServer,
            contractB.id
        )

        // Expect un-withdrawn rate formData to equal formData before it was withdrawn
        expect(
            unwithdrawnRate.packageSubmissions[0].rateRevision.formData
        ).toEqual({
            ...formData,
            rateMedicaidPopulations: [],
            rateDocuments: expect.arrayContaining(
                formData.rateDocuments.map((doc) =>
                    expect.objectContaining({
                        ...doc,
                        id: expect.any(String),
                    })
                )
            ),
            supportingDocuments: expect.arrayContaining(
                formData.supportingDocuments.map((doc) =>
                    expect.objectContaining({
                        ...doc,
                        id: expect.any(String),
                    })
                )
            ),
        })
        expect(unwithdrawnRate.withdrawnFromContracts).toHaveLength(0)
        expect(unwithdrawnRate.consolidatedStatus).toBe('RESUBMITTED')
        expect(unwithdrawnRate.parentContractID).toBe(contractA.id)

        //expect contract A to have rate back
        expect(submittedContractA.withdrawnRates).toHaveLength(0)
        expect(submittedContractA.packageSubmissions[0].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        //expect contract B to have rate back
        expect(submittedContractB.withdrawnRates).toHaveLength(0)
        expect(submittedContractB.packageSubmissions[0].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // Check history
        const contractAHistory =
            contractHistoryToDescriptions(submittedContractA)
        const contractBHistory =
            contractHistoryToDescriptions(submittedContractB)

        // Expect contract A history to be in order
        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `CMS withdrawing rate ${formData.rateCertificationName} from this submission. Withdraw invalid rate`,
                `CMS has withdrawn rate ${formData.rateCertificationName} from this submission. Withdraw invalid rate`,
                'Unlock after withdraw',
                'Submit before undo withdraw',
                `Undo withdrawal of rate ${formData.rateCertificationName} from this submission. Undo withdraw rate`,
                `CMS has changed the status of rate ${formData.rateCertificationName} to submitted. Undo withdraw rate`,
            ])
        )

        // Expect contract B to be in order
        expect(contractBHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `CMS withdrawing rate ${formData.rateCertificationName} from this submission. Withdraw invalid rate`,
                `CMS has withdrawn rate ${formData.rateCertificationName} from this submission. Withdraw invalid rate`,
                `Withdraw submission. withdraw contractB`,
                `CMS withdrew the submission from review. withdraw contractB`,
                `Undo withdrawal of rate ${formData.rateCertificationName} from this submission. Undo withdraw rate`,
                `CMS has changed the status of rate ${formData.rateCertificationName} to submitted. Undo withdraw rate`,
            ])
        )
    })

    it('sends emails to CMS and state contacts when a rate is unwithdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer(emailConfig)
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
            emailer: mockEmailer,
        })

        const draftA = await createAndUpdateTestContractWithRate(stateServer)
        const draftAWithExtraRate = await addNewRateToTestContract(
            stateServer,
            draftA
        )
        const contractA = await submitTestContract(
            stateServer,
            draftAWithExtraRate.id,
            undefined
        )

        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate contract B
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

        await submitTestContract(stateServer, contractB.id, undefined)

        await unlockTestContractAsUser(
            cmsServer,
            contractB.id,
            'unlock to prep for withdraw rate',
            cmsUser
        )

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate'
        )

        expect(withdrawnRate.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnRate.withdrawnFromContracts?.length).toBe(2)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractA.id,
                }),
                expect.objectContaining({
                    id: contractB.id,
                }),
            ])
        )

        const validateContractA = await fetchTestContract(
            cmsServer,
            contractA.id
        )
        expect(validateContractA.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const validateContractB = await fetchTestContract(
            cmsServer,
            contractB.id
        )
        expect(validateContractB.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        await unlockTestContractAsUser(
            cmsServer,
            contractA.id,
            'Unlock after withdraw',
            cmsUser
        )

        const submittedContractB = await submitTestContract(
            stateServer,
            contractB.id,
            'resubmit after withdrawing rate'
        )

        const submittedContractA = await submitTestContract(
            stateServer,
            contractA.id,
            'Submit before undo withdraw'
        )

        const contractAName =
            submittedContractA.packageSubmissions[0].contractRevision
                .contractName
        const contractBName =
            submittedContractB.packageSubmissions[0].contractRevision
                .contractName

        const stateReceiverEmails =
            contractA.packageSubmissions[0].contractRevision.formData.stateContacts.map(
                (contact) => contact.email
            )

        const unwithdrawnRate = await undoWithdrawTestRate(
            cmsServer,
            rateID,
            'Undo withdraw rate'
        )

        const unwithdrawnRateName =
            unwithdrawnRate.packageSubmissions[0].rateRevision.formData
                .rateCertificationName!

        //Check state email for proper info
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            7,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${unwithdrawnRateName} status update`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(stateReceiverEmails),
                bodyHTML: expect.stringContaining(unwithdrawnRateName),
            })
        )

        //Check that all submissions related to the rate were included in the state email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            7,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractAName),
            })
        )
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            7,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractBName),
            })
        )

        //Check CMS email for proper info
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            8,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${unwithdrawnRateName} status update`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().dmcpSubmissionEmails,
                    ...testEmailConfig().oactEmails,
                ]),
                bodyHTML: expect.stringContaining(unwithdrawnRateName),
            })
        )

        //Check that all submissions related to the rate were included in the CMS email
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            8,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractAName),
            })
        )
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            8,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractBName),
            })
        )
    })
})

describe('undo withdraw rate error handling', async () => {
    it('returns an error if any of the withdrawn from contracts statuses are invalid', async () => {
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
            undefined
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate contract B
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

        await submitTestContract(stateServer, contractB.id, undefined)

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        await approveTestContract(cmsServer, contractB.id, undefined)

        const response = await cmsServer.executeOperation(
            {
                query: UndoWithdrawnRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'I expect an undo withdraw error',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const unwithdrawnRate = extractGraphQLResponse(response)

        expect(unwithdrawnRate.errors).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toContain(
            `Attempted to undo rate withdrawal with contract(s) that are in an invalid state. Invalid contract IDs: ${[contractB.id]}`
        )
    })

    it('returns an error if parent contract is in an invalid state', async () => {
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
            undefined
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate contract B
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

        await submitTestContract(stateServer, contractB.id, undefined)

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        await withdrawTestContract(
            cmsServer,
            contractA.id,
            'Withdraw ContractA'
        )

        const response = await cmsServer.executeOperation(
            {
                query: UndoWithdrawnRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'I expect an undo withdraw error',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const unwithdrawnRate = extractGraphQLResponse(response)

        expect(unwithdrawnRate.errors).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toContain(
            `Attempted to undo rate withdrawal with parent contract in an invalid state: WITHDRAWN`
        )
    })

    it('returns an error if a non CMS user attempts to withdraw a rate', async () => {
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
            undefined
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        const response = await stateServer.executeOperation(
            {
                query: UndoWithdrawnRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'I expect an undo withdraw error',
                    },
                },
            },
            {
                contextValue: { user: stateUser },
            }
        )

        const unwithdrawnRate = extractGraphQLResponse(response)

        expect(unwithdrawnRate.errors?.[0]).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toBe(
            'user not authorized to undo withdraw rate'
        )
    })

    it('returns an error when withdraw rate failed in postgres', async () => {
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
                undoWithdrawRate: mockStoreThatErrors().undoWithdrawRate,
            },
        })

        const contractA = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        const response = await cmsServer.executeOperation(
            {
                query: UndoWithdrawnRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'I expect an undo withdraw error',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const unwithdrawnRate = extractGraphQLResponse(response)

        // expect error for attempting to withdraw rate in postgres
        expect(unwithdrawnRate.errors?.[0]).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toBe(
            'Failed to undo withdraw rate: UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
        )
    })
    it('returns an error when rate is not withdrawn', async () => {
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
                undoWithdrawRate: mockStoreThatErrors().undoWithdrawRate,
            },
        })

        const contractA = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined
        )
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        if (!rateID) {
            throw new Error('Unexpected error: rate not found')
        }

        const response = await cmsServer.executeOperation(
            {
                query: UndoWithdrawnRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'I expect an undo withdraw error',
                    },
                },
            },
            {
                contextValue: { user: cmsUser },
            }
        )

        const unwithdrawnRate = extractGraphQLResponse(response)

        // expect error for attempting to withdraw rate in postgres
        expect(unwithdrawnRate.errors?.[0]).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toBe(
            `Attempted to undo rate withdrawal with wrong status. Rate: SUBMITTED`
        )
    })
})

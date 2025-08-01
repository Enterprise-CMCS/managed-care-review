import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
} from '../../testHelpers/gqlHelpers'
import {
    approveTestContract,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    submitTestContract,
    unlockTestContract,
    withdrawTestContract,
    contractHistoryToDescriptions,
} from '../../testHelpers/gqlContractHelpers'
import { fetchTestRateById, must } from '../../testHelpers'
import type { RateFormDataInput, RateStrippedEdge } from '../../gen/gqlClient'
import {
    SubmitContractDocument,
    UpdateDraftContractRatesDocument,
} from '../../gen/gqlClient'
import {
    addNewRateToTestContract,
    fetchTestIndexRatesStripped,
} from '../../testHelpers/gqlRateHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'

const testRateFormInputData = (): RateFormDataInput => ({
    rateType: 'AMENDMENT',
    rateCapitationType: 'RATE_RANGE',
    rateDateStart: '2024-01-01',
    rateDateEnd: '2025-01-01',
    rateDateCertified: '2024-01-01',
    amendmentEffectiveDateStart: '2024-02-01',
    amendmentEffectiveDateEnd: '2025-02-01',
    rateProgramIDs: [defaultFloridaProgram().id],
    deprecatedRateProgramIDs: [],
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

describe('withdrawContract', () => {
    const stateUser = testStateUser()
    const cmsUser = testCMSUser()

    it('can withdraw contract-only submission', async () => {
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

        const contract = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        await submitTestContract(stateServer, contract.id, undefined, { user: stateUser })

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission',
            { user: cmsUser }
        )

        const contractHistory = contractHistoryToDescriptions(withdrawnContract)
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw submission`,
                `CMS withdrew the submission from review. withdraw submission`,
            ])
        )
    })

    it('cant withdraw contract and rate submission', async () => {
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
            await createAndUpdateTestContractWithRate(stateServer, undefined, { user: stateUser })
        await addNewRateToTestContract(stateServer, draftContract, undefined, { user: stateUser })

        const contract = await submitTestContract(stateServer, draftContract.id, undefined, { user: stateUser })

        const rateARevision = contract.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contract.packageSubmissions[0].rateRevisions[1]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        must(await unlockTestContract(cmsServer, contract.id, 'unlock', { user: cmsUser }))
        must(await submitTestContract(stateServer, contract.id, 'resubmit', { user: stateUser }))

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission',
            { user: cmsUser }
        )

        const contractHistory =
            await contractHistoryToDescriptions(withdrawnContract)

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)
        const rateB = await fetchTestRateById(cmsServer, rateBRevision.rateID)

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateB.consolidatedStatus).toBe('WITHDRAWN')
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw submission`,
                `CMS withdrew the submission from review. withdraw submission`,
            ])
        )
    })

    it('can withdraw contract and reassigns parent contract to rates that cannot be withdrawn', async () => {
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
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]
        const rateCRevision = contractA.packageSubmissions[0].rateRevisions[2]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateCRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBRevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id, undefined, { user: stateUser })

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateCRevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        // // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id, undefined, { user: stateUser })
        await approveTestContract(cmsServer, draftContractC.id, undefined, { user: cmsUser })

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A',
            { user: cmsUser }
        )

        const indexRatesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode
        )

        const rateA = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateARevision.rateID
        )?.node
        const rateB = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateBRevision.rateID
        )?.node
        const rateC = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateCRevision.rateID
        )?.node

        if (!rateA) {
            throw new Error('Expected rateA to exist')
        }
        if (!rateB) {
            throw new Error('Expected rateB to exist')
        }
        if (!rateC) {
            throw new Error('Expected rateC to exist')
        }

        // expect rateA to be withdrawn with the original parent contract
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.parentContractID).toBe(contractA.id)

        // expect rateB to be resubmitted and contract B to be the parent
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        // expect rateB to be resubmitted and contract C to be the parent
        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractC.id)

        const contractAHistory =
            contractHistoryToDescriptions(withdrawnContract)

        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw contract A`,
                `CMS withdrew the submission from review. withdraw contract A`,
            ])
        )
    })

    it('can withdraw contract and reassigns multiple rates to the same parent contract', async () => {
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
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]
        const rateCRevision = contractA.packageSubmissions[0].rateRevisions[2]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateCRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBRevision.rateID,
                            },
                            {
                                type: 'LINK',
                                rateID: rateCRevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id, undefined, { user: stateUser })

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A',
            { user: cmsUser }
        )

        const indexRatesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode
        )

        const rateA = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateARevision.rateID
        )?.node
        const rateB = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateBRevision.rateID
        )?.node
        const rateC = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateCRevision.rateID
        )?.node

        if (!rateA) {
            throw new Error('Expected rateA to exist')
        }
        if (!rateB) {
            throw new Error('Expected rateB to exist')
        }
        if (!rateC) {
            throw new Error('Expected rateC to exist')
        }

        // expect rateA to be withdrawn with the original parent contract
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.parentContractID).toBe(contractA.id)

        // expect rateB to be resubmitted and contract B to be the parent
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        // expect rateC to be resubmitted and contract B to be the parent
        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractB.id)

        const contractAHistory =
            await contractHistoryToDescriptions(withdrawnContract)

        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw contract A`,
                `CMS withdrew the submission from review. withdraw contract A`,
            ])
        )
    })

    it('prioritizes submitted contracts for rate parent contract reassignment', async () => {
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
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id, undefined, { user: stateUser })

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        await submitTestContract(stateServer, draftContractC.id, undefined, { user: stateUser })
        await approveTestContract(cmsServer, draftContractC.id, undefined, { user: cmsUser })

        const draftContractD =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractD.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractD.id,
                        lastSeenUpdatedAt:
                            draftContractD.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        await submitTestContract(stateServer, draftContractD.id, undefined, { user: stateUser })
        await unlockTestContract(
            cmsServer,
            draftContractD.id,
            'unlock contract D',
            { user: cmsUser }
        )

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A',
            { user: cmsUser }
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        // expect contract A to be withdrawn
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        // expect rate A to be resubmitted and its new parent contract is B.
        expect(rateA.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateA.parentContractID).toBe(draftContractB.id)
    })

    it('prioritizes unlocked contracts for rate parent contract reassignment when there are no submitted contracts', async () => {
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
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id, undefined, { user: stateUser })
        await unlockTestContract(
            cmsServer,
            draftContractB.id,
            'unlock and should be parent contract of rate A',
            { user: cmsUser }
        )

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        // // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id, undefined, { user: stateUser })
        await approveTestContract(cmsServer, draftContractC.id, undefined, { user: cmsUser })

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A',
            { user: cmsUser }
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        // expect rateA to be withdrawn with the original parent contract
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        // expect rate B to be unlocked and its new parent contract is B.
        expect(rateA.consolidatedStatus).toBe('UNLOCKED')
        expect(rateA.parentContractID).toBe(draftContractB.id)
    })

    it('withdraws rate with reassigned parent', async () => {
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
            await createAndUpdateTestContractWithRate(stateServer, undefined, { user: stateUser })
        await addNewRateToTestContract(stateServer, draftContract, undefined, { user: stateUser })

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        // leave contract B submitted, which should not allow rate B to be withdrawn
        await submitTestContract(stateServer, draftContractB.id, undefined, { user: stateUser })

        //withdraw contractA
        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contractA',
            { user: cmsUser }
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        // expect contractA to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        // expect rateB to be resubmitted and contractB to be its new parent
        expect(rateA.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateA.parentContractID).toBe(draftContractB.id)

        // withdraw contractB
        const withdrawnContractB = await withdrawTestContract(
            cmsServer,
            draftContractB.id,
            'withdraw contractB',
            { user: cmsUser }
        )
        const withdrawnRateA = await fetchTestRateById(cmsServer, rateA.id)
        // expect contractB to be withdrawn
        expect(withdrawnContractB.consolidatedStatus).toBe('WITHDRAWN')
        // expect rateB to now be withdrawn since parent submission is also withdrawn
        expect(withdrawnRateA.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('withdraws rate with parent when linked contract is unlocked without previously submitting with linked rate', async () => {
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
            await createAndUpdateTestContractWithRate(stateServer, undefined, { user: stateUser })

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer, undefined, { user: stateUser })

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            }, {
                contextValue: {
                    user: testStateUser(),
                },
            })
        )

        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A',
            { user: cmsUser }
        )
        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        //expect contract to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        // expect rate to be withdrawn even though it is linked to unlocked contract b
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')

        // try to resubmit unlocked contract linked to rate without previously having submitted with it.
        const resubmitContractB = await stateServer.executeOperation({
            query: SubmitContractDocument,
            variables: {
                input: {
                    contractID: draftContractB.id,
                    submittedReason: 'Trying to submit with a withdrawn rate',
                },
            },
        }, {
            contextValue: {
                user: testStateUser(),
            },
        })

        // expect errors when trying to resubmit with a withdrawn rate
        expect(resubmitContractB.errors).toBeDefined()
        // expect error to be rateA in withdrawn status
        expect(resubmitContractB.errors?.[0].message).toBe(
            `Attempted to submit a contract with a withdrawn rate. Rate id: ${rateA.id}`
        )
    })

    it('sends emails to state and CMS when a submission is withdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer()
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

        const contract = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        await submitTestContract(stateServer, contract.id, undefined, { user: stateUser })

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission',
            { user: cmsUser }
        )

        const contractName =
            withdrawnContract.packageSubmissions[0].contractRevision
                .contractName
        const stateReceiverEmails =
            withdrawnContract.packageSubmissions[0].contractRevision.formData.stateContacts.map(
                (contact) => contact.email
            )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} was withdrawn by CMS`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(stateReceiverEmails),
                bodyHTML: expect.stringContaining(contractName),
            })
        )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} was withdrawn by CMS`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().dmcpSubmissionEmails,
                    ...testEmailConfig().oactEmails,
                ]),
                bodyHTML: expect.stringContaining(contractName),
            })
        )
    })
})

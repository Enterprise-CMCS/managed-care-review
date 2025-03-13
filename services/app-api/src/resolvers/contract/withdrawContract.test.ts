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

        await submitTestContract(stateServer, contract.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
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
            await createAndUpdateTestContractWithRate(stateServer)
        await addNewRateToTestContract(stateServer, draftContract)

        const contract = await submitTestContract(stateServer, draftContract.id)

        const rateARevision = contract.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contract.packageSubmissions[0].rateRevisions[1]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        must(await unlockTestContract(cmsServer, contract.id, 'unlock'))
        must(await submitTestContract(stateServer, contract.id, 'resubmit'))

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)
        const rateB = await fetchTestRateById(cmsServer, rateBRevision.rateID)

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateB.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('cant withdraw contract and rates submissions without withdrawing linked rates', async () => {
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
            await createAndUpdateTestContractWithoutRates(stateServer)

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
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
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
            await createAndUpdateTestContractWithoutRates(stateServer)

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
            })
        )

        // leave contract B submitted, which should not allow rate B to be withdrawn
        await submitTestContract(stateServer, draftContractB.id)

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

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
            })
        )

        // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id)
        await approveTestContract(cmsServer, draftContractC.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
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

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA?.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateB?.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC?.consolidatedStatus).toBe('RESUBMITTED')
    }, 10000)

    it('withdraws rate with parent contract when linked to withdrawn contract', async () => {
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
        await addNewRateToTestContract(stateServer, draftContract)

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

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
            })
        )

        await submitTestContract(stateServer, draftContractB.id)

        // Withdraw contractB
        const withdrawnContractB = await withdrawTestContract(
            cmsServer,
            draftContractB.id,
            'withdraw contract b'
        )
        expect(withdrawnContractB.consolidatedStatus).toBe('WITHDRAWN')

        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract a'
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

        // Expect contractA and all child rates to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA?.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateB?.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('withdraws rate if when withdrawing linked contract and parent contract is already withdrawn', async () => {
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
        await addNewRateToTestContract(stateServer, draftContract)

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

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
            })
        )

        // leave contract B submitted, which should not allow rate B to be withdrawn
        await submitTestContract(stateServer, draftContractB.id)

        //withdraw contractA
        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contractA'
        )

        const rateB = await fetchTestRateById(cmsServer, rateBRevision.rateID)

        // expect contractA to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        // expect rateB to be resubmitted
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')

        // withdraw contractB
        const withdrawnContractB = await withdrawTestContract(
            cmsServer,
            draftContractB.id,
            'withdraw contractB'
        )
        const withdrawnRateB = await fetchTestRateById(
            cmsServer,
            rateBRevision.rateID
        )
        // expect contractB to be withdrawn
        expect(withdrawnContractB.consolidatedStatus).toBe('WITHDRAWN')
        // expect rateB to now be withdrawn since parent submission is also withdrawn
        expect(withdrawnRateB.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('withdraws rate with contract when rate is linked to unlocked contract', async () => {
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

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

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
            })
        )

        await submitTestContract(stateServer, draftContractB.id)
        // unlock contractB
        await unlockTestContract(
            cmsServer,
            draftContractB.id,
            'unlock contractB'
        )

        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
        )
        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        //expect contract to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        // expect rate to be withdrawn even though it is linked to unlocked contract b
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')

        const resubmitContractB = await stateServer.executeOperation({
            query: SubmitContractDocument,
            variables: {
                input: {
                    contractID: draftContractB.id,
                    submittedReason: 'Trying to submit with a withdrawn rate',
                },
            },
        })

        // expect errors
        expect(resubmitContractB.errors).toBeDefined()
        // expect error to be rateA in withdrawn status
        expect(resubmitContractB.errors?.[0].message).toBe(
            `Attempted to submit a contract with a withdrawn rate. Rate id: ${rateA.id}`
        )
    })
})

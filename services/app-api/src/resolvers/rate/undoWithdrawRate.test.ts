import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
} from '../../testHelpers/gqlHelpers'
import {
    approveTestContract,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import {
    withdrawTestRate,
    undoWithdrawRate,
} from '../../testHelpers/gqlRateHelpers'
import { must } from '../../testHelpers'
import type { RateFormDataInput, Contract } from '../../gen/gqlClient'
import {
    UndoWithdrawnRateDocument,
    UpdateDraftContractRatesDocument,
} from '../../gen/gqlClient'
import { describe } from 'vitest'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'

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

const reduceHistoryToDescriptions = (contract: Contract): string[] => {
    return contract.packageSubmissions.reduce((history: string[], pkgSub) => {
        const updatedHistory = history

        if (pkgSub.cause !== 'CONTRACT_SUBMISSION') {
            return updatedHistory
        }

        if (pkgSub.submitInfo.updatedReason) {
            updatedHistory.unshift(pkgSub.submitInfo.updatedReason)
        }

        if (pkgSub.contractRevision.unlockInfo?.updatedReason) {
            updatedHistory.unshift(
                pkgSub.contractRevision.unlockInfo.updatedReason
            )
        }

        return updatedHistory
    }, [])
}

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

    const contractA = await createAndSubmitTestContractWithRate(stateServer)
    const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID
    const formData = contractA.packageSubmissions[0].rateRevisions[0].formData

    const contractB = await createAndUpdateTestContractWithoutRates(stateServer)

    // link rate contract B
    must(
        await stateServer.executeOperation({
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: contractB.id,
                    lastSeenUpdatedAt: contractB.draftRevision?.updatedAt,
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
        })
    )

    await submitTestContract(stateServer, contractB.id)

    await unlockTestContract(
        cmsServer,
        contractB.id,
        'unlock to prep for withdraw rate'
    )

    await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

    await unlockTestContract(cmsServer, contractA.id, 'Unlock after withdraw')

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

    const unwithdrawnRate = await undoWithdrawRate(
        cmsServer,
        rateID,
        'Undo withdraw rate'
    )

    const submittedContractA = await fetchTestContract(cmsServer, contractA.id)
    const submittedContractB = await fetchTestContract(cmsServer, contractB.id)

    // Expect un-withdrawn rate formData to equal formData before it was withdrawn
    expect(unwithdrawnRate.packageSubmissions[0].rateRevision.formData).toEqual(
        formData
    )
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
    const contractAHistory = reduceHistoryToDescriptions(submittedContractA)
    const contractBHistory = reduceHistoryToDescriptions(submittedContractB)

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
}, 10000)

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

        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate contract B
        must(
            await stateServer.executeOperation({
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: contractB.id,
                        lastSeenUpdatedAt: contractB.draftRevision?.updatedAt,
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
            })
        )

        await submitTestContract(stateServer, contractB.id)

        await unlockTestContract(
            cmsServer,
            contractB.id,
            'unlock to prep for withdraw rate'
        )

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        await approveTestContract(cmsServer, contractA.id)

        const unwithdrawnRate = await cmsServer.executeOperation({
            query: UndoWithdrawnRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'I expect an undo withdraw error',
                },
            },
        })

        expect(unwithdrawnRate.errors).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toContain(
            `Attempted to undo rate withdrawal with contract(s) that are in an invalid state. Invalid contract IDs: ${[contractA.id, contractB.id]}`
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

        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        const unwithdrawnRate = await stateServer.executeOperation({
            query: UndoWithdrawnRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'I expect an undo withdraw error',
                },
            },
        })

        expect(unwithdrawnRate.errors?.[0]).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toBe(
            'user not authorized to undo withdraw rate'
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
                undoWithdrawRate: mockStoreThatErrors().undoWithdrawRate,
            },
        })

        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        const unwithdrawnRate = await cmsServer.executeOperation({
            query: UndoWithdrawnRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'I expect an undo withdraw error',
                },
            },
        })

        // expect error for attempting to withdraw rate in postgres
        expect(unwithdrawnRate.errors?.[0]).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toBe(
            'Failed to undo withdraw rate: UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
        )
    })
    it('returns and error when rate is not withdrawn', async () => {
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

        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const rate = contractA.packageSubmissions[0].rateRevisions[0].rate

        if (!rate) {
            throw new Error('Unexpected error: rate not found')
        }

        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const unwithdrawnRate = await cmsServer.executeOperation({
            query: UndoWithdrawnRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'I expect an undo withdraw error',
                },
            },
        })

        // expect error for attempting to withdraw rate in postgres
        expect(unwithdrawnRate.errors?.[0]).toBeDefined()
        expect(unwithdrawnRate.errors?.[0].message).toBe(
            `Attempted to undo rate withdrawal with wrong status. Rate: ${rate.consolidatedStatus}`
        )
    })
})

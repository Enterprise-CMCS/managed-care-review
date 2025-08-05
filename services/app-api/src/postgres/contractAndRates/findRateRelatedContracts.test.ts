import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    approveTestContractAsUser,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { must } from '../../testHelpers'
import { UpdateDraftContractRatesDocument } from '../../gen/gqlClient'
import { testRateFormInputData } from '../../testHelpers/gqlRateHelpers'
import { findRateRelatedContracts } from './findRateRelatedContracts'

it('returns related contracts with correct status', async () => {
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

    const submittedContractA =
        await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })
    const rateAID =
        submittedContractA.packageSubmissions[0].rateRevisions[0].rateID

    await unlockTestContract(cmsServer, submittedContractA.id, 'unlock 1', { user: cmsUser })
    await submitTestContract(stateServer, submittedContractA.id, 'submit 2', { user: stateUser })

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
                            rateID: rateAID,
                        },
                        {
                            type: 'CREATE',
                            formData: testRateFormInputData(),
                        },
                    ],
                },
            },
        }, {
            contextValue: { user: stateUser },
        })
    )

    await submitTestContract(stateServer, contractB.id, undefined, { user: stateUser })

    let rateARelatedStrippedContracts = must(
        await findRateRelatedContracts(client, rateAID)
    )

    // expect parent contract B to be resubmitted
    expect(rateARelatedStrippedContracts).toEqual(
        expect.arrayContaining([
            {
                id: submittedContractA.id,
                consolidatedStatus: 'RESUBMITTED',
            },
            {
                id: contractB.id,
                consolidatedStatus: 'SUBMITTED',
            },
        ])
    )

    await unlockTestContract(
        cmsServer,
        submittedContractA.id,
        'unlocked parent contract',
        { user: cmsUser }
    )

    const contractC = await createAndUpdateTestContractWithoutRates(stateServer)
    // link rate contract C
    must(
        await stateServer.executeOperation({
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: contractC.id,
                    lastSeenUpdatedAt: contractC.draftRevision?.updatedAt,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: rateAID,
                        },
                        {
                            type: 'CREATE',
                            formData: testRateFormInputData(),
                        },
                    ],
                },
            },
        }, {
            contextValue: { user: stateUser },
        })
    )

    await submitTestContract(stateServer, contractC.id, undefined, { user: stateUser })

    const unlockedContractB = await unlockTestContract(
        cmsServer,
        contractB.id,
        'unlock to remove rate A',
        { user: cmsUser }
    )
    const rateBID = unlockedContractB.packageSubmissions[0].rateRevisions.find(
        (rate) => rate.rateID !== rateAID
    )?.rateID

    if (!rateBID) {
        throw new Error('Unexpected error: rateBID should exist, but does not.')
    }

    // Remove rateA from contractB, but keep it unlocked
    must(
        await stateServer.executeOperation({
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: unlockedContractB.id,
                    lastSeenUpdatedAt:
                        unlockedContractB.draftRevision?.updatedAt,
                    updatedRates: [
                        {
                            type: 'UPDATE',
                            formData: testRateFormInputData(),
                            rateID: rateBID,
                        },
                    ],
                },
            },
        }, {
            contextValue: { user: stateUser },
        })
    )

    rateARelatedStrippedContracts = must(
        await findRateRelatedContracts(client, rateAID)
    )

    // expect all contracts to still be related
    expect(rateARelatedStrippedContracts).toEqual(
        expect.arrayContaining([
            {
                id: submittedContractA.id,
                consolidatedStatus: 'UNLOCKED',
            },
            {
                id: contractB.id,
                consolidatedStatus: 'UNLOCKED',
            },
            {
                id: contractC.id,
                consolidatedStatus: 'SUBMITTED',
            },
        ])
    )

    // resubmit contract B should remove it from the related contracts
    await submitTestContract(
        stateServer,
        contractB.id,
        'resubmit contractB without rateA',
        { user: stateUser }
    )

    // approve contractC
    await approveTestContract(cmsServer, contractC.id, undefined, { user: cmsUser })

    rateARelatedStrippedContracts = must(
        await findRateRelatedContracts(client, rateAID)
    )

    // expect B to be gone and C to be approved
    expect(rateARelatedStrippedContracts).toEqual(
        expect.arrayContaining([
            {
                id: submittedContractA.id,
                consolidatedStatus: 'UNLOCKED',
            },
            {
                id: contractC.id,
                consolidatedStatus: 'APPROVED',
            },
        ])
    )
})

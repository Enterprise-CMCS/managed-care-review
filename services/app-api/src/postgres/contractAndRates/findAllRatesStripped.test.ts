import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
    unlockTestContractAsUser,
} from '../../testHelpers/gqlContractHelpers'
import { findAllRatesStripped } from './findAllRatesStripped'
import { must } from '../../testHelpers'
import type { StrippedRateType } from '../../domain-models/contractAndRates'
import { UpdateDraftContractRatesDocument } from '../../gen/gqlClient'
import {
    undoWithdrawTestRate,
    withdrawTestRate,
    testRateFormInputData,
} from '../../testHelpers/gqlRateHelpers'
import { expect } from 'vitest'

it('returns all rates with stripped down data', async () => {
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

    await unlockTestContractAsUser(cmsServer, submittedContractA.id, 'unlock 1', cmsUser)
    await submitTestContract(stateServer, submittedContractA.id, 'submit 2', { user: stateUser })

    await unlockTestContractAsUser(cmsServer, submittedContractA.id, 'unlock 2', cmsUser)

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

    const submittedContractB = await submitTestContract(
        stateServer,
        contractB.id,
        undefined,
        { user: stateUser }
    )
    const rateBID = submittedContractB.packageSubmissions[0].rateRevisions.find(
        (rate) => rate.rateID !== rateAID
    )?.rateID

    if (!rateBID) {
        throw new Error('Unexpected error: rateBID should exist, but does not.')
    }

    await withdrawTestRate(cmsServer, rateBID, 'Withdraw invalid rate', { user: cmsUser })

    const strippedRatesOrErrors = must(await findAllRatesStripped(client))
    const strippedRates: StrippedRateType[] = []
    strippedRatesOrErrors.forEach((rate) => {
        if (!(rate.rate instanceof Error)) {
            strippedRates.push(rate.rate)
        }
    })

    const rateAFromArray = strippedRates.find((rate) => rate.id === rateAID)
    const rateBFromArray = strippedRates.find((rate) => rate.id === rateBID)

    // expect rateA to have expected data
    expect(
        rateAFromArray?.latestSubmittedRevision.submitInfo?.updatedReason
    ).toBe('submit 2')
    expect(rateAFromArray?.initiallySubmittedAt).toStrictEqual(
        submittedContractA.initiallySubmittedAt
    )
    expect(rateAFromArray?.parentContractID).toEqual(submittedContractA.id)
    expect(rateAFromArray?.status).toBe('UNLOCKED')
    expect(rateAFromArray?.consolidatedStatus).toBe('UNLOCKED')
    expect(rateAFromArray?.draftRevision?.unlockInfo?.updatedReason).toBe(
        'unlock 2'
    )

    // expect rateB to have expected data as a withdrawn rate
    expect(
        rateBFromArray?.latestSubmittedRevision.submitInfo?.updatedReason
    ).toContain('CMS has withdrawn this rate. Withdraw invalid rate')
    expect(rateBFromArray?.initiallySubmittedAt).toStrictEqual(
        submittedContractB.initiallySubmittedAt
    )
    expect(rateBFromArray?.parentContractID).toEqual(submittedContractB.id)
    expect(rateBFromArray?.status).toBe('RESUBMITTED')
    expect(rateBFromArray?.consolidatedStatus).toBe('WITHDRAWN')
    expect(
        rateBFromArray?.latestSubmittedRevision?.unlockInfo?.updatedReason
    ).toContain('Withdraw invalid')
    expect(rateBFromArray?.reviewStatusActions?.length).toBe(1)
    expect(rateBFromArray?.reviewStatusActions?.[0].actionType).toBe('WITHDRAW')

    // Undo the rate withdraw
    await undoWithdrawTestRate(cmsServer, rateBID, 'Undo withdraw rateB', { user: cmsUser })

    const strippedRatesOrErrorsAgain = must(await findAllRatesStripped(client))
    const strippedRatesAgain: StrippedRateType[] = []
    strippedRatesOrErrorsAgain.forEach((rate) => {
        if (!(rate.rate instanceof Error)) {
            strippedRatesAgain.push(rate.rate)
        }
    })

    const rateBFromArrayAgain = strippedRatesAgain.find(
        (rate) => rate.id === rateBID
    )

    if (!rateBFromArrayAgain) {
        throw new Error('Expected to find rateB')
    }

    // expect rateB to have expected data after undo withdraw rate
    expect(
        rateBFromArrayAgain.latestSubmittedRevision.submitInfo?.updatedReason
    ).toContain('Undo withdraw rateB')
    expect(rateBFromArrayAgain.initiallySubmittedAt).toStrictEqual(
        submittedContractB.initiallySubmittedAt
    )
    expect(rateBFromArrayAgain.parentContractID).toEqual(submittedContractB.id)
    expect(rateBFromArrayAgain.status).toBe('RESUBMITTED')
    expect(rateBFromArrayAgain.consolidatedStatus).toBe('RESUBMITTED')
    expect(
        rateBFromArrayAgain.latestSubmittedRevision?.unlockInfo?.updatedReason
    ).toContain('Undo withdraw rateB')
    expect(rateBFromArrayAgain.reviewStatusActions?.length).toBe(2)
    expect(rateBFromArrayAgain.reviewStatusActions?.[0].actionType).toBe(
        'UNDER_REVIEW'
    )
    expect(rateBFromArrayAgain.reviewStatusActions?.[1].actionType).toBe(
        'WITHDRAW'
    )

    const selectedStrippedRates = must(
        await findAllRatesStripped(client, {
            rateIDs: [rateBFromArrayAgain.id],
        })
    )

    // Expect only rate B to return
    expect(selectedStrippedRates).toHaveLength(1)
    expect(selectedStrippedRates[0].rateID).toBe(rateBFromArrayAgain.id)

    const emptySelectedStrippedRatesOrError = must(
        await findAllRatesStripped(client)
    )
    const emptySelectedStrippedRates: StrippedRateType[] = []
    emptySelectedStrippedRatesOrError.forEach((rate) => {
        if (!(rate.rate instanceof Error)) {
            emptySelectedStrippedRates.push(rate.rate)
        }
    })

    // Expect our only two rate
    const rateAFromArrayEmptyArray = emptySelectedStrippedRates.find(
        (rate) => rate.id === rateAID
    )
    const rateBFromArrayEmptyArray = emptySelectedStrippedRates.find(
        (rate) => rate.id === rateBID
    )

    // expect both our rates, we cannot expect on length of rates because DB data persists between tests.
    expect(rateAFromArrayEmptyArray).toBeDefined()
    expect(rateBFromArrayEmptyArray).toBeDefined()

    const notRealRateSelectedOrError = must(
        await findAllRatesStripped(client, {
            rateIDs: ['not-a-real-rate-id'],
        })
    )

    // ID should not exist so we expect no results
    expect(notRealRateSelectedOrError).toHaveLength(0)
})

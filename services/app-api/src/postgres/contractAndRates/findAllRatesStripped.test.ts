import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { findAllRatesStripped } from './findAllRatesStripped'
import { consoleLogFullData, must } from '../../testHelpers'
import type { StrippedRateType } from '../../domain-models/contractAndRates'
import type { RateFormDataInput } from '../../gen/gqlClient'
import { UpdateDraftContractRatesDocument } from '../../gen/gqlClient'
import {
    undoWithdrawTestRate,
    withdrawTestRate,
} from '../../testHelpers/gqlRateHelpers'

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

it('returns all rates with stripped down data', async () => {
    const client = await sharedTestPrismaClient()

    const stateServer = await constructTestPostgresServer({
        context: {
            user: testStateUser(),
        },
    })

    const cmsServer = await constructTestPostgresServer({
        context: {
            user: testCMSUser(),
        },
    })

    const submittedContractA =
        await createAndSubmitTestContractWithRate(stateServer)
    const rateAID =
        submittedContractA.packageSubmissions[0].rateRevisions[0].rateID

    await unlockTestContract(cmsServer, submittedContractA.id, 'unlock 1')
    await submitTestContract(stateServer, submittedContractA.id, 'submit 2')

    await unlockTestContract(cmsServer, submittedContractA.id, 'unlock 2')

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
        })
    )

    const submittedContractB = await submitTestContract(
        stateServer,
        contractB.id
    )
    const rateBID = submittedContractB.packageSubmissions[0].rateRevisions.find(
        (rate) => rate.rateID !== rateAID
    )?.rateID

    if (!rateBID) {
        throw new Error('Unexpected error: rateBID should exist, but does not.')
    }

    await withdrawTestRate(cmsServer, rateBID, 'Withdraw invalid rate')

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
    await undoWithdrawTestRate(cmsServer, rateBID, 'Undo withdraw rateB')

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
    // expect rateB to have expected data after undo withdraw rate
    consoleLogFullData(rateBFromArrayAgain)
    expect(
        rateBFromArrayAgain?.latestSubmittedRevision.submitInfo?.updatedReason
    ).toContain('Undo withdraw rateB')
    expect(rateBFromArrayAgain?.initiallySubmittedAt).toStrictEqual(
        submittedContractB.initiallySubmittedAt
    )
    expect(rateBFromArrayAgain?.parentContractID).toEqual(submittedContractB.id)
    expect(rateBFromArrayAgain?.status).toBe('RESUBMITTED')
    expect(rateBFromArrayAgain?.consolidatedStatus).toBe('RESUBMITTED')
    expect(
        rateBFromArrayAgain?.latestSubmittedRevision?.unlockInfo?.updatedReason
    ).toContain('Undo withdraw rateB')
    expect(rateBFromArrayAgain?.reviewStatusActions?.length).toBe(2)
    expect(rateBFromArrayAgain?.reviewStatusActions?.[0].actionType).toBe(
        'UNDER_REVIEW'
    )
    expect(rateBFromArrayAgain?.reviewStatusActions?.[1].actionType).toBe(
        'WITHDRAW'
    )
}, 10000)

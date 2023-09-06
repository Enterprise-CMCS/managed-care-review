import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createInsertContractData, must } from '../../testHelpers'
import { insertDraftContract } from './insertContract'
import type { InsertRateArgsType } from './insertRate'
import { createInsertRateData } from '../../testHelpers/contractAndRates/rateHelpers'
import { updateDraftContractRates } from './updateDraftContractRates'
import type { InsertOrConnectRateArgsType } from './updateDraftContractRates'
import type { RateFormEditable } from './updateDraftRate'
import { submitRate } from './submitRate'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftRate } from './insertRate'
import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'

describe('updateDraftContractRates', () => {
    it('create, update, and disconnects many rates', async () => {
        // Make a new contract
        const client = await sharedTestPrismaClient()
        const draftContractFormData = createInsertContractData({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        // Array of new rates to create
        const newRates: InsertOrConnectRateArgsType[] = [
            createInsertRateData({
                rateType: 'NEW',
            }),
            createInsertRateData({
                rateType: 'AMENDMENT',
            }),
            createInsertRateData({
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
            }),
        ]

        // Update contract with new rates
        const updatedContractWithNewRates = must(
            await updateDraftContractRates(client, {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                connectOrCreate: newRates,
            })
        )

        if (!updatedContractWithNewRates.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        const newlyCreatedRates =
            updatedContractWithNewRates.draftRevision.rateRevisions

        // Expect 3 rates
        expect(newlyCreatedRates).toHaveLength(3)

        // Array of the current rates, but now with updates
        const updateRateRevisionData: RateFormEditable[] = [
            {
                ...newlyCreatedRates[0].formData,
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 'fakeS3URL1',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 1',
                        titleRole: 'Title',
                        email: 'statecontact1@example.com',
                        actuarialFirm: 'MERCER',
                    },
                ],
            },
            {
                ...newlyCreatedRates[1].formData,
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 2 Doc',
                        s3URL: 'fakeS3URL2',
                        sha256: 'someShaForRateDoc2',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 8, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 7, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 2',
                        titleRole: 'Title',
                        email: 'statecontact2@example.com',
                        actuarialFirm: 'MILLIMAN',
                    },
                ],
            },
            {
                ...newlyCreatedRates[2].formData,
                rateDocuments: [
                    {
                        name: 'Rate 3 Doc',
                        s3URL: 'fakeS3URL3',
                        sha256: 'someShaForRateDoc3',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 3, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 4, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 3',
                        titleRole: 'Title',
                        email: 'statecontact3@example.com',
                        actuarialFirmOther: 'Some other actuary firm',
                    },
                ],
            },
        ]

        // Update many rates in the contract
        const updatedContractRates = must(
            await updateDraftContractRates(client, {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                connectOrCreate: [],
                updateRateRevisions: updateRateRevisionData,
                disconnectRates: [],
            })
        )

        if (!updatedContractRates.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        const updatedRateRevisions =
            updatedContractRates.draftRevision.rateRevisions

        // expect three updated rates
        expect(updatedRateRevisions).toHaveLength(3)

        // expect rate data to match what we defined in the updates
        expect(updatedRateRevisions).toEqual(
            expect.arrayContaining([
                // expect updated rate revisions to have our defined rate revision data from updateRateRevisionData
                expect.objectContaining({
                    ...updatedRateRevisions[0],
                    formData: expect.objectContaining({
                        ...updatedRateRevisions[0].formData,
                        ...updateRateRevisionData[0],
                    }),
                }),
                expect.objectContaining({
                    ...updatedRateRevisions[1],
                    formData: expect.objectContaining({
                        ...updatedRateRevisions[1].formData,
                        ...updateRateRevisionData[1],
                    }),
                }),
                expect.objectContaining({
                    ...updatedRateRevisions[2],
                    formData: expect.objectContaining({
                        ...updatedRateRevisions[2].formData,
                        ...updateRateRevisionData[2],
                    }),
                }),
            ])
        )

        // Disconnect many rates in the contract

        // lets make sure we have rate ids
        if (
            !updatedRateRevisions[0].formData.rateID ||
            !updatedRateRevisions[1].formData.rateID ||
            !updatedRateRevisions[2].formData.rateID
        ) {
            throw new Error(
                'Unexpected error. Rate revisions did not contain rate IDs'
            )
        }

        // set rate 3 for disconnection
        const disconnectRates = [updatedRateRevisions[2].formData.rateID]

        // disconnect the rates
        const contractAfterRateDisconnection = must(
            await updateDraftContractRates(client, {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                connectOrCreate: [],
                updateRateRevisions: [],
                disconnectRates: disconnectRates,
            })
        )

        // expect two rate revisions
        expect(
            contractAfterRateDisconnection.draftRevision?.rateRevisions
        ).toHaveLength(2)

        // Create, Update and Disconnect many contracts
        const contractAfterManyCrud = must(
            await updateDraftContractRates(client, {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                // create two new rates
                connectOrCreate: [
                    createInsertRateData({
                        rateType: 'NEW',
                        certifyingActuaryContacts: [
                            {
                                name: 'New Contact',
                                titleRole: 'Title',
                                email: 'newstatecontact@example.com',
                                actuarialFirmOther: 'New firm',
                            },
                        ],
                    }),
                    createInsertRateData({
                        rateType: 'AMENDMENT',
                        certifyingActuaryContacts: [
                            {
                                name: 'New Contact 2',
                                titleRole: 'Title',
                                email: 'newstatecontact2@example.com',
                                actuarialFirmOther: 'New firm 2',
                            },
                        ],
                    }),
                ],
                // Update existing first rate
                updateRateRevisions: [
                    {
                        ...contractAfterRateDisconnection.draftRevision
                            ?.rateRevisions[0].formData,
                        certifyingActuaryContacts: [
                            {
                                name: 'Actuary Contact 1 Last update',
                                titleRole: 'Title',
                                email: 'statecontact1@example.com',
                                actuarialFirm: 'MERCER',
                            },
                        ],
                    },
                ],
                // disconnect existing second rate
                disconnectRates: [updatedRateRevisions[1].formData.rateID],
            })
        )

        if (!contractAfterManyCrud.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        const rateRevisionsAfterManyCrud =
            contractAfterManyCrud.draftRevision?.rateRevisions

        must(
            await client.rateTable.findFirst({
                where: {
                    id: rateRevisionsAfterManyCrud[0].formData.rateID,
                },
            })
        )

        // should expect 3 rates
        expect(rateRevisionsAfterManyCrud).toHaveLength(3)

        // expect rates to have correct data
        expect(rateRevisionsAfterManyCrud).toEqual(
            expect.arrayContaining([
                // expect our first rate to the existing rate we updated
                expect.objectContaining({
                    ...rateRevisionsAfterManyCrud[0],
                    formData: {
                        ...rateRevisionsAfterManyCrud[0].formData,
                        certifyingActuaryContacts: [
                            {
                                name: 'Actuary Contact 1 Last update',
                                titleRole: 'Title',
                                email: 'statecontact1@example.com',
                                actuarialFirm: 'MERCER',
                            },
                        ],
                    },
                }),
                // expect our second and third rate to be the new rates
                expect.objectContaining({
                    ...rateRevisionsAfterManyCrud[1],
                    formData: {
                        ...rateRevisionsAfterManyCrud[1].formData,
                        rateType: 'NEW',
                        certifyingActuaryContacts: [
                            {
                                name: 'New Contact',
                                titleRole: 'Title',
                                email: 'newstatecontact@example.com',
                                actuarialFirmOther: 'New firm',
                            },
                        ],
                    },
                }),
                expect.objectContaining({
                    ...rateRevisionsAfterManyCrud[2],
                    formData: {
                        ...rateRevisionsAfterManyCrud[2].formData,
                        rateType: 'AMENDMENT',
                        certifyingActuaryContacts: [
                            {
                                name: 'New Contact 2',
                                titleRole: 'Title',
                                email: 'newstatecontact2@example.com',
                                actuarialFirmOther: 'New firm 2',
                            },
                        ],
                    },
                }),
            ])
        )
    })

    it('connects existing rates to contract', async () => {
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

        const draftContractFormData = createInsertContractData({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        // new rate
        const draftRate = must(
            await insertDraftRate(
                client,
                createInsertRateData({
                    rateType: 'NEW',
                    stateCode: 'MN',
                })
            )
        )

        // get state data
        const previousStateData = must(
            await client.state.findFirst({
                where: {
                    stateCode: draftContract.stateCode,
                },
            })
        )

        if (!previousStateData) {
            throw new Error('Unexpected error: Cannot find state record')
        }

        const createDraftRateData = createInsertRateData({
            rateType: 'NEW',
            stateCode: 'MN',
        })

        // update draft contract with rates
        const updatedDraftContract = must(
            await updateDraftContractRates(client, {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                connectOrCreate: [
                    {
                        ...draftRate.draftRevision?.formData,
                        stateCode: stateUser.stateCode as StateCodeType,
                    },
                    {
                        ...createDraftRateData,
                        stateCode: stateUser.stateCode as StateCodeType,
                    },
                ],
            })
        )

        // expect two rates connected to contract
        expect(updatedDraftContract.draftRevision?.rateRevisions).toHaveLength(
            2
        )

        // get state data again and compare to previous data
        const currentStateData = must(
            await client.state.findFirst({
                where: {
                    stateCode: draftContract.stateCode,
                },
            })
        )

        if (!currentStateData) {
            throw new Error('Unexpected error: Cannot find state record')
        }

        // expect current state data rate cert count to be one more than previous, because we only created one new rate
        // in our updateDraftContractRates call.
        expect(currentStateData.latestStateRateCertNumber).toEqual(
            previousStateData.latestStateRateCertNumber + 1
        )
    })

    it('errors when trying to update a submitted rate', async () => {
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

        const draftContractFormData = createInsertContractData({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        // new rate
        const newRate: InsertRateArgsType = createInsertRateData({
            rateType: 'NEW',
        })

        // Update contract with new rates
        const updatedContractWithNewRates = must(
            await updateDraftContractRates(client, {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                connectOrCreate: [newRate],
                updateRateRevisions: [],
                disconnectRates: [],
            })
        )

        if (!updatedContractWithNewRates.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        const newlyCreatedRates =
            updatedContractWithNewRates.draftRevision.rateRevisions

        // lets make sure we have rate ids
        if (!newlyCreatedRates[0].formData.rateID) {
            throw new Error(
                'Unexpected error. Rate revisions did not contain rate IDs'
            )
        }

        // expect 1 rates
        expect(newlyCreatedRates).toHaveLength(1)

        // submit rate
        must(
            await submitRate(
                client,
                newlyCreatedRates[0].formData.rateID,
                stateUser.id,
                'Rate submit'
            )
        )

        // Update contract with new rates
        const attemptToUpdateSubmittedRate = await updateDraftContractRates(
            client,
            {
                draftContract: {
                    ...draftContract,
                    draftRevision: draftContract.draftRevision,
                },
                connectOrCreate: [],
                updateRateRevisions: [
                    {
                        ...newlyCreatedRates[0].formData,
                        rateType: 'AMENDMENT',
                    },
                ],
                disconnectRates: [],
            }
        )

        expect(attemptToUpdateSubmittedRate).toBeInstanceOf(Error)
    })
})

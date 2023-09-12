import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { createInsertContractData, must } from '../../testHelpers'
import type { ContractFormEditable } from './updateDraftContract'
import { updateDraftContract } from './updateDraftContract'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'
import type { ContractType } from '@prisma/client'
import type { RateFormDataType } from '../../domain-models/contractAndRates'
import { createInsertRateData } from '../../testHelpers/contractAndRates/rateHelpers'
import { v4 as uuidv4 } from 'uuid'
import type { RateFormEditable } from './updateDraftRate'
import { insertDraftRate } from './insertRate'
import { submitRate } from './submitRate';
import {unlockRate} from './unlockRate';

describe('updateDraftContract', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('updates drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1 = createInsertContractData({})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { stateCode, ...draftContractFormData } = draftContractForm1
        const contract = must(
            await insertDraftContract(client, {
                ...draftContractForm1,
            })
        )

        const draftContractForm2 = {
            ...draftContractFormData,
            submissionDescription: 'something else',
        }
        const draft = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
            })
        )

        expect(draft.draftRevision).toBeDefined()
        expect(draft.draftRevision?.formData.submissionDescription).toBe(
            'something else'
        )
    })

    it('updates linked documents as expected in multiple requests', async () => {
        const client = await sharedTestPrismaClient()

        const draftContractForm1: ContractFormEditable = {
            submissionDescription: 'draftData1',
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/contract1',
                    name: 'Rate cert 1',
                    sha256: 'shaS56',
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/contractsupporting1-1',
                    name: 'supporting documents 1-1',
                    sha256: 'shaS56',
                },
            ],
        }
        // documents all replaced, additional supporting docs added
        const draftContractForm2: ContractFormEditable = {
            submissionDescription: 'draftData2',
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/contract2',
                    name: 'Rate cert 2',
                    sha256: 'shaS56',
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/contractsupporting2-1',
                    name: 'supporting documents 2-1',
                    sha256: 'shaS56',
                },
                {
                    s3URL: 's3://bucketname/key/contractsupporting2-2',
                    name: 'supporting documents2-2',
                    sha256: 'shaS56',
                },
            ],
        }

        // documents unchanged
        const draftContractForm3: ContractFormEditable = {
            submissionDescription: 'draftData3',
            contractDocuments: draftContractForm2.contractDocuments,
            supportingDocuments: draftContractForm1.supportingDocuments,
        }

        const contract = must(
            await insertDraftContract(client, createInsertContractData({}))
        )

        const draft1 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm1,
            })
        )

        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)
        expect(draft1.draftRevision?.formData.contractDocuments).toHaveLength(1)

        const draft2 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
            })
        )

        expect(draft2.draftRevision?.formData.submissionDescription).toBe(
            'draftData2'
        )

        expect(draft2.draftRevision?.formData.contractDocuments).toEqual(
            draftContractForm2.contractDocuments
        )
        expect(draft2.draftRevision?.formData.supportingDocuments).toEqual(
            draftContractForm2.supportingDocuments
        )

        const draft3 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm3,
            })
        )
        expect(draft3.draftRevision?.formData.submissionDescription).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.supportingDocuments).toHaveLength(
            1
        )
        expect(draft3.draftRevision?.formData.contractDocuments).toEqual(
            draftContractForm3.contractDocuments
        )
        expect(draft3.draftRevision?.formData.supportingDocuments).toEqual(
            draftContractForm3.supportingDocuments
        )
    })

    it('updates linked contacts as expected in multiple requests', async () => {
        const client = await sharedTestPrismaClient()
        const draftContractForm1: ContractFormEditable = {
            submissionDescription: 'draftData1',
            stateContacts: [
                {
                    name: 'Certifying Actuary 1',
                    titleRole: 'Test Certifying Actuary 1',
                    email: 'certifying1@example.com',
                },
            ],
        }
        // all contacts replaced
        const draftContractForm2: ContractFormEditable = {
            submissionDescription: 'draftData2',
            stateContacts: [
                {
                    name: 'Certifying Actuary 2',
                    titleRole: 'Test Certifying Actuary 2',
                    email: 'certifying2@example.com',
                },
            ],
        }

        // contacts values unchanged
        const draftContractForm3: ContractFormEditable = {
            submissionDescription: 'draftData3',
            stateContacts: draftContractForm2.stateContacts,
        }

        const contract = must(
            await insertDraftContract(client, createInsertContractData({}))
        )

        const draft1 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm1,
            })
        )

        expect(draft1.draftRevision?.formData.stateContacts).toHaveLength(1)

        const draft2 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm2,
            })
        )

        expect(draft2.draftRevision?.formData.submissionDescription).toBe(
            'draftData2'
        )
        expect(draft2.draftRevision?.formData.stateContacts).toEqual(
            draftContractForm2.stateContacts
        )

        const draft3 = must(
            await updateDraftContract(client, {
                contractID: contract.id,
                formData: draftContractForm3,
            })
        )
        expect(draft3.draftRevision?.formData.submissionDescription).toBe(
            'draftData3'
        )
        expect(draft3.draftRevision?.formData.stateContacts).toEqual(
            draftContractForm3.stateContacts
        )
    })

    it('returns an error when invalid form data for contract type provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()

        const client = await sharedTestPrismaClient()
        const draftContractInsert = createInsertContractData({})
        const newRate = must(
            await insertDraftContract(client, draftContractInsert)
        )
        // use type coercion to pass in bad data
        const updatedRate = await updateDraftContract(client, {
            contractID: newRate.id,
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'NOT_REAL' as ContractType,
            },
        })

        // Expect a prisma error
        expect(updatedRate).toBeInstanceOf(PrismaClientValidationError)
    })

    it('returns an error when invalid contract ID provided', async () => {
        jest.spyOn(console, 'error').mockImplementation()

        const client = await sharedTestPrismaClient()

        const draftContract = await updateDraftContract(client, {
            contractID: 'not-real-id',
            formData: {
                submissionDescription: 'a new contract',
                contractType: 'AMENDMENT',
            },
        })

        // Expect a prisma error
        expect(draftContract).toBeInstanceOf(Error) // eventually should be PrismaClientKnownRequestError
    })

    it('create, update, and disconnects many rates', async () => {
        // Make a new contract
        const client = await sharedTestPrismaClient()
        const draftContractFormData = createInsertContractData({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        // Array of new rates to create
        const newRates: RateFormDataType[] = [
            createInsertRateData({
                id: uuidv4(),
                rateType: 'NEW',
            }),
            createInsertRateData({
                id: uuidv4(),
                rateType: 'AMENDMENT',
            }),
            createInsertRateData({
                id: uuidv4(),
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
            }),
        ]

        // Update contract with new rates
        const updatedContractWithNewRates = must(
            await updateDraftContract(client, {
                contractID: draftContract.id,
                formData: {},
                rateFormDatas: newRates,
            })
        )

        if (!updatedContractWithNewRates.draftRevision) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        const newlyCreatedRates =
            updatedContractWithNewRates.draftRevision?.rateRevisions

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
            await updateDraftContract(client, {
                contractID: updatedContractWithNewRates.id,
                formData: {},
                rateFormDatas: updateRateRevisionData,
            })
        )

        if (updatedContractRates.draftRevision === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
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
            !updatedRateRevisions[0].formData ||
            !updatedRateRevisions[1].formData ||
            !updatedRateRevisions[2].formData
        ) {
            throw new Error(
                'Unexpected error. Rate revisions did not contain rate IDs'
            )
        }

        // disconnect rate 3
        const contractAfterRateDisconnection = must(
            await updateDraftContract(client, {
                contractID: updatedContractRates.id,
                formData: {},
                rateFormDatas: [
                    updatedRateRevisions[0].formData,
                    updatedRateRevisions[1].formData,
                ],
            })
        )

        // expect two rate revisions
        expect(
            contractAfterRateDisconnection.draftRevision?.rateRevisions
        ).toHaveLength(2)

        // Create, Update and Disconnect many contracts
        const contractAfterManyCrud = must(
            await updateDraftContract(client, {
                contractID: contractAfterRateDisconnection.id,
                formData: {},
                // create two new rates
                rateFormDatas: [
                    createInsertRateData({
                        id: uuidv4(),
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
                        id: uuidv4(),
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
                    // leave out rate 2 for disconnection
                ],
            })
        )

        if (contractAfterManyCrud.draftRevision === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        const rateRevisionsAfterManyCrud =
            contractAfterManyCrud.draftRevision?.rateRevisions

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

        const draftContractFormData = createInsertContractData({})
        const draftContract = must(
            await insertDraftContract(client, draftContractFormData)
        )

        // new draft rate
        const draftRate = must(
            await insertDraftRate(
                client,
                createInsertRateData({
                    rateType: 'NEW',
                    stateCode: 'MN',
                })
            )
        )

        if (!draftRate.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

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
            id: uuidv4(),
            rateType: 'NEW',
            stateCode: 'MN',
        })

        // update draft contract with rates
        const updatedDraftContract = must(
            await updateDraftContract(client, {
                contractID: draftContract.id,
                formData: {},
                rateFormDatas: [
                    draftRate.draftRevision?.formData,
                    createDraftRateData,
                ],
            })
        )

        // expect two rates connected to contract
        expect(updatedDraftContract.draftRevision?.rateRevisions).toHaveLength(
            2
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

        // new rate
        const newRate = createInsertRateData({
            id: uuidv4(),
            rateType: 'NEW',
        })

        // Update contract with new rates
        const updatedContractWithNewRates = must(
            await updateDraftContract(client, {
                contractID: draftContract.id,
                formData: {},
                rateFormDatas: [newRate],
            })
        )

        if (!updatedContractWithNewRates.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
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
        const submittedExistingRate = must(
            await submitRate(
                client,
                newlyCreatedRates[0].formData.rateID,
                stateUser.id,
                'Rate submit'
            )
        )

        if (!submittedExistingRate.revisions[0].formData) {
            throw new Error(
                'Unexpected error. Rate revisions did not contain rate IDs'
            )
        }

        // Update contract with submitted rate and try to update the submitted rate revision
        const attemptToUpdateSubmittedRate = must(await updateDraftContract(
            client,
            {
                contractID: updatedContractWithNewRates.id,
                formData: {},
                rateFormDatas: [
                    // attempt to update the revision data of a submitted rate.
                    {
                        ...submittedExistingRate.revisions[0].formData,
                        rateType: 'AMENDMENT',
                    },
                ],
            }
        ))

        if (!attemptToUpdateSubmittedRate.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        // We still expect 1 connected rate
        expect(attemptToUpdateSubmittedRate.draftRevision.rateRevisions).toHaveLength(1)

        // We expect the rate type to not be changed to 'AMENDMENT'
        expect(attemptToUpdateSubmittedRate.draftRevision.rateRevisions[0].formData.rateType).toBe('NEW')
    })
})

import UPDATE_DRAFT_CONTRACT_RATES from '../../../../app-graphql/src/mutations/updateDraftContractRates.graphql'
import FETCH_RATE from 'app-graphql/src/queries/fetchRate.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    createTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import {
    createTestDraftRateOnContract,
    fetchTestRateById,
    updateTestDraftRateOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'

describe('updateDraftContractRates', () => {
    it('returns 404 for an unknown Contract', async () => {
        const stateServer = await constructTestPostgresServer()

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: 'foobar',
                    updatedRates: [],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('No Errors')
        }

        expect(result.errors[0].message).toBe(
            'contract with ID foobar not found'
        )
        expect(result.errors[0].extensions?.code).toBe('NOT_FOUND')
    })

    it('errors for access from a different state', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createTestHealthPlanPackage(stateServer)

        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'MA',
                }),
            },
        })

        const result = await otherStateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('No Errors')
        }

        expect(result.errors[0].message).toBe(
            'user not authorized to update a draft from a different state'
        )
        expect(result.errors[0].extensions?.code).toBe('FORBIDDEN')
    })

    it('errors for access from a CMS user', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createTestHealthPlanPackage(stateServer)

        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const result = await otherStateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('No Errors')
        }

        expect(result.errors[0].message).toBe(
            'user not authorized to update a draft'
        )
        expect(result.errors[0].extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects updates to submitted contract', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createAndSubmitTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('No Errors')
        }

        expect(result.errors[0].message).toBe(
            'you cannot update a contract that is not DRAFT or UNLOCKED'
        )
        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
    })

    it('rejects updates with bad update schema', async () => {
        const testRateFormData = {
            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateDateStart: '2024-01-01',
            rateDateEnd: '2025-01-01',
            rateProgramIDs: ['foo'],
            deprecatedRateProgramIDs: [],

            rateDocuments: [
                {
                    s3URL: 'foo://bar',
                    name: 'ratedoc1.doc',
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
        }

        const stateServer = await constructTestPostgresServer()

        const draft = await createAndSubmitTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [
                        {
                            // invalid
                            type: 'CREATE',
                            rateID: 'foobar',
                            formData: testRateFormData,
                        },
                        {
                            // valid
                            type: 'CREATE',
                            formData: testRateFormData,
                        },
                        {
                            // valid
                            type: 'UPDATE',
                            rateID: 'foobar',
                            formData: testRateFormData,
                        },
                        {
                            // invalid
                            type: 'UPDATE',
                            formData: testRateFormData,
                        },
                        {
                            // invalid
                            type: 'UPDATE',
                        },
                        {
                            // invalid
                            type: 'LINK',
                            rateID: 'foobar',
                            formData: testRateFormData,
                        },
                        {
                            // valid
                            type: 'LINK',
                            rateID: 'foobar',
                        },
                    ],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('No Errors')
        }

        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')

        const errMsg = result.errors[0].message
        const prefix = 'updatedRates not correctly formatted: '
        expect(errMsg.startsWith(prefix)).toBeTruthy()

        const errJSON = errMsg.substring(prefix.length)
        const errs = JSON.parse(errJSON)

        const paths = errs.map((e: { path: [number, string] }) => e.path)
        expect(paths).toEqual([
            [0, 'rateID'],
            [3, 'rateID'],
            [4, 'rateID'],
            [4, 'formData'],
            [5, 'formData'],
        ])
    })

    it('adds a new rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [
                        {
                            type: 'CREATE',
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],
                                deprecatedRateProgramIDs: [],
                                rateDocuments: [
                                    {
                                        s3URL: 'foo://bar',
                                        name: 'ratedoc1.doc',
                                        sha256: 'foobar',
                                    },
                                ],
                                supportingDocuments: [
                                    {
                                        s3URL: 'foo://bar1',
                                        name: 'ratesupdoc1.doc',
                                        sha256: 'foobar1',
                                    },
                                    {
                                        s3URL: 'foo://bar2',
                                        name: 'ratesupdoc2.doc',
                                        sha256: 'foobar2',
                                    },
                                ],
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Foo Person',
                                        titleRole: 'Bar Job',
                                        email: 'foo@example.com',
                                        actuarialFirm: 'GUIDEHOUSE',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        name: 'Bar Person',
                                        titleRole: 'Baz Job',
                                        email: 'bar@example.com',
                                        actuarialFirm: 'OTHER',
                                        actuarialFirmOther: 'Some Firm',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                            },
                        },
                    ],
                },
            },
        })

        expect(result.errors).toBeUndefined()
        if (!result.data) {
            throw new Error('No data returned')
        }

        const draftRates =
            result.data.updateDraftContractRates.contract.draftRates

        expect(draftRates).toHaveLength(1)
    })

    it('updates an existing rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createAndUpdateTestHealthPlanPackage(stateServer)
        const draftFD = latestFormData(draft)
        const rate = draftFD.rateInfos[0]

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [
                        {
                            type: 'UPDATE',
                            rateID: rate.id,
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],
                                deprecatedRateProgramIDs: [],
                                rateDocuments: [
                                    {
                                        s3URL: 'foo://bar',
                                        name: 'updatedratedoc1.doc',
                                        sha256: 'foobar',
                                    },
                                ],
                                supportingDocuments: [
                                    {
                                        s3URL: 'foo://bar1',
                                        name: 'ratesupdoc1.doc',
                                        sha256: 'foobar1',
                                    },
                                    {
                                        s3URL: 'foo://bar2',
                                        name: 'ratesupdoc2.doc',
                                        sha256: 'foobar2',
                                    },
                                ],
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Foo Person',
                                        titleRole: 'Bar Job',
                                        email: 'foo@example.com',
                                        actuarialFirm: 'GUIDEHOUSE',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        name: 'Bar Person',
                                        titleRole: 'Baz Job',
                                        email: 'bar@example.com',
                                        actuarialFirm: 'OTHER',
                                        actuarialFirmOther: 'Some Firm',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                            },
                        },
                    ],
                },
            },
        })
        expect(result.errors).toBeUndefined()

        if (!result.data) {
            throw new Error('no data returned')
        }

        const draftRates =
            result.data.updateDraftContractRates.contract.draftRates

        const draftFormData = draftRates[0].draftRevision.formData

        expect(draftFormData.rateType).toBe('AMENDMENT')
        expect(draftFormData.rateDocuments).toHaveLength(1)
        expect(draftFormData.rateDocuments[0].name).toBe('updatedratedoc1.doc')
    })

    it('doesnt allow updating a non-existent rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createAndUpdateTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [
                        {
                            type: 'UPDATE',
                            rateID: 'foo-bar',
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],
                                deprecatedRateProgramIDs: [],
                                rateDocuments: [
                                    {
                                        s3URL: 'foo://bar',
                                        name: 'updatedratedoc1.doc',
                                        sha256: 'foobar',
                                    },
                                ],
                                supportingDocuments: [
                                    {
                                        s3URL: 'foo://bar1',
                                        name: 'ratesupdoc1.doc',
                                        sha256: 'foobar1',
                                    },
                                    {
                                        s3URL: 'foo://bar2',
                                        name: 'ratesupdoc2.doc',
                                        sha256: 'foobar2',
                                    },
                                ],
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Foo Person',
                                        titleRole: 'Bar Job',
                                        email: 'foo@example.com',
                                        actuarialFirm: 'GUIDEHOUSE',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        name: 'Bar Person',
                                        titleRole: 'Baz Job',
                                        email: 'bar@example.com',
                                        actuarialFirm: 'OTHER',
                                        actuarialFirmOther: 'Some Firm',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                            },
                        },
                    ],
                },
            },
        })
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(result.errors?.[0].message).toBe(
            'Attempted to update a rate not associated with this contract: foo-bar'
        )
    })

    it('doesnt allow updating an unassociated rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createAndUpdateTestHealthPlanPackage(stateServer)
        const draft2 = await createAndUpdateTestHealthPlanPackage(stateServer)
        const draft2FD = latestFormData(draft2)
        const rate = draft2FD.rateInfos[0]

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [
                        {
                            type: 'UPDATE',
                            rateID: rate.id,
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],
                                deprecatedRateProgramIDs: [],
                                rateDocuments: [
                                    {
                                        s3URL: 'foo://bar',
                                        name: 'updatedratedoc1.doc',
                                        sha256: 'foobar',
                                    },
                                ],
                                supportingDocuments: [
                                    {
                                        s3URL: 'foo://bar1',
                                        name: 'ratesupdoc1.doc',
                                        sha256: 'foobar1',
                                    },
                                    {
                                        s3URL: 'foo://bar2',
                                        name: 'ratesupdoc2.doc',
                                        sha256: 'foobar2',
                                    },
                                ],
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Foo Person',
                                        titleRole: 'Bar Job',
                                        email: 'foo@example.com',
                                        actuarialFirm: 'GUIDEHOUSE',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        name: 'Bar Person',
                                        titleRole: 'Baz Job',
                                        email: 'bar@example.com',
                                        actuarialFirm: 'OTHER',
                                        actuarialFirmOther: 'Some Firm',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                            },
                        },
                    ],
                },
            },
        })
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(result.errors?.[0].message).toContain(
            'Attempted to update a rate not associated with this contract'
        )
    })

    it('allows creating and updating a partial rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const contractDraft = await createTestHealthPlanPackage(stateServer)

        const ratesDraft = await createTestDraftRateOnContract(
            stateServer,
            contractDraft.id,
            {
                rateType: 'AMENDMENT',
                rateDateStart: '2021-02-02',
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                deprecatedRateProgramIDs: [],
                certifyingActuaryContacts: [],
                addtlActuaryContacts: [],
            }
        )

        if (!ratesDraft.draftRates?.[0]) {
            throw new Error('No Rate')
        }

        const rateID = ratesDraft.draftRates[0].id
        const preFD = ratesDraft.draftRates[0].draftRevision?.formData
        if (!preFD) {
            throw new Error('no rate data')
        }

        expect(preFD.rateType).toBe('AMENDMENT')
        expect(preFD.rateDateStart).toBe('2021-02-02')

        const finalDraft = await updateTestDraftRateOnContract(
            stateServer,
            contractDraft.id,
            rateID,
            {
                rateType: 'NEW',
                rateDocuments: [],
                supportingDocuments: [],
                rateProgramIDs: [],
                deprecatedRateProgramIDs: [],
                certifyingActuaryContacts: [],
                addtlActuaryContacts: [],
            }
        )

        const postFD = finalDraft.draftRates?.[0].draftRevision?.formData
        if (!postFD) {
            throw new Error('no rate data again')
        }

        expect(postFD.rateType).toBe('NEW')
        expect(postFD.rateDateStart).toBeNull()
    })

    it('allows linking to another submitted rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const otherPackage =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const otherFD = latestFormData(otherPackage)
        const foreignRateID = otherFD.rateInfos[0].id

        const contractDraft = await createTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: foreignRateID,
                        },
                    ],
                },
            },
        })

        expect(result.errors).toBeUndefined()
        if (!result.data) {
            throw new Error('no result')
        }

        const draftRates =
            result.data.updateDraftContractRates.contract.draftRates

        expect(draftRates).toHaveLength(1)

        const rateFormData = draftRates[0].revisions[0].formData

        expect(rateFormData.rateType).toBe('NEW')
        expect(rateFormData.rateDocuments).toHaveLength(1)
        expect(rateFormData.rateDocuments[0].name).toBe('rateDocument.pdf')
    })

    it('doesnt allow updating a linked rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const otherPackage =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const otherFD = latestFormData(otherPackage)
        const foreignRateID = otherFD.rateInfos[0].id

        const contractDraft = await createTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: foreignRateID,
                        },
                    ],
                },
            },
        })

        expect(result.errors).toBeUndefined()
        if (!result.data) {
            throw new Error('no result')
        }

        const draftRates =
            result.data.updateDraftContractRates.contract.draftRates

        expect(draftRates).toHaveLength(1)

        const rateID = draftRates[0].id

        const updateResult = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'UPDATE',
                            rateID: rateID,
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],
                                deprecatedRateProgramIDs: [],
                                rateDocuments: [
                                    {
                                        s3URL: 'foo://bar',
                                        name: 'updatedratedoc1.doc',
                                        sha256: 'foobar',
                                    },
                                ],
                                supportingDocuments: [
                                    {
                                        s3URL: 'foo://bar1',
                                        name: 'ratesupdoc1.doc',
                                        sha256: 'foobar1',
                                    },
                                    {
                                        s3URL: 'foo://bar2',
                                        name: 'ratesupdoc2.doc',
                                        sha256: 'foobar2',
                                    },
                                ],
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Foo Person',
                                        titleRole: 'Bar Job',
                                        email: 'foo@example.com',
                                        actuarialFirm: 'GUIDEHOUSE',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        name: 'Bar Person',
                                        titleRole: 'Baz Job',
                                        email: 'bar@example.com',
                                        actuarialFirm: 'OTHER',
                                        actuarialFirmOther: 'Some Firm',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                            },
                        },
                    ],
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (!updateResult.errors) {
            throw new Error('no result')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
    })

    it('doesnt allow linking a DRAFT rate', async () => {
        const stateServer = await constructTestPostgresServer()
        const otherPackage =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        const otherFD = latestFormData(otherPackage)
        const foreignRateID = otherFD.rateInfos[0].id

        const contractDraft = await createTestHealthPlanPackage(stateServer)

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: foreignRateID,
                        },
                    ],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('no result')
        }

        expect(result.errors[0].message).toContain(
            'Attempted to link a rate that has never been submitted'
        )
        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
    })

    it('doesnt allow updating a non-child rate', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const otherPackage =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        await unlockTestHealthPlanPackage(
            cmsServer,
            otherPackage.id,
            'unlock to not update'
        )

        const otherFD = latestFormData(otherPackage)
        const foreignRateID = otherFD.rateInfos[0].id

        const contractDraft = await createTestHealthPlanPackage(stateServer)

        const linkResult = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: foreignRateID,
                        },
                    ],
                },
            },
        })

        expect(linkResult.errors).toBeUndefined()

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'UPDATE',
                            rateID: foreignRateID,
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],
                                deprecatedRateProgramIDs: [],
                                rateDocuments: [
                                    {
                                        s3URL: 'foo://bar',
                                        name: 'updatedratedoc1.doc',
                                        sha256: 'foobar',
                                    },
                                ],
                                supportingDocuments: [
                                    {
                                        s3URL: 'foo://bar1',
                                        name: 'ratesupdoc1.doc',
                                        sha256: 'foobar1',
                                    },
                                    {
                                        s3URL: 'foo://bar2',
                                        name: 'ratesupdoc2.doc',
                                        sha256: 'foobar2',
                                    },
                                ],
                                certifyingActuaryContacts: [
                                    {
                                        name: 'Foo Person',
                                        titleRole: 'Bar Job',
                                        email: 'foo@example.com',
                                        actuarialFirm: 'GUIDEHOUSE',
                                    },
                                ],
                                addtlActuaryContacts: [
                                    {
                                        name: 'Bar Person',
                                        titleRole: 'Baz Job',
                                        email: 'bar@example.com',
                                        actuarialFirm: 'OTHER',
                                        actuarialFirmOther: 'Some Firm',
                                    },
                                ],
                                actuaryCommunicationPreference:
                                    'OACT_TO_ACTUARY',
                            },
                        },
                    ],
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (!result.errors) {
            throw new Error('no result')
        }

        expect(result.errors[0].message).toContain(
            'Attempted to update a rate that is not a child of this contract'
        )
        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        // TODO: This test must be updated to account for CHILDREN
    })

    it('allows unlinking another submitted rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const otherPackage =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const otherFD = latestFormData(otherPackage)
        const foreignRateID = otherFD.rateInfos[0].id

        const contractDraft = await createTestHealthPlanPackage(stateServer)

        const linkResult = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: foreignRateID,
                        },
                    ],
                },
            },
        })

        expect(linkResult.errors).toBeUndefined()
        if (!linkResult.data) {
            throw new Error('no linkResult')
        }

        const draftRates =
            linkResult.data.updateDraftContractRates.contract.draftRates

        expect(draftRates).toHaveLength(1)

        const unlinkResult = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: contractDraft.id,
                    updatedRates: [],
                },
            },
        })

        expect(unlinkResult.errors).toBeUndefined()
        if (!unlinkResult.data) {
            throw new Error('no unlinkResult')
        }

        const emptyDraftRates =
            unlinkResult.data.updateDraftContractRates.contract.draftRates

        expect(emptyDraftRates).toHaveLength(0)
    })

    it('deletes a draft rate', async () => {
        const stateServer = await constructTestPostgresServer()

        const draft = await createAndUpdateTestHealthPlanPackage(stateServer)
        const draftFD = latestFormData(draft)
        const rate = draftFD.rateInfos[0]

        if (!rate.id) {
            throw new Error('rate no id')
        }

        const existingRateResult = await fetchTestRateById(stateServer, rate.id)
        expect(existingRateResult.id).toBeDefined()

        const result = await stateServer.executeOperation({
            query: UPDATE_DRAFT_CONTRACT_RATES,
            variables: {
                input: {
                    contractID: draft.id,
                    updatedRates: [],
                },
            },
        })
        expect(result.errors).toBeUndefined()

        if (!result.data) {
            throw new Error('no data returned')
        }

        const draftRates =
            result.data.updateDraftContractRates.contract.draftRates

        expect(draftRates).toHaveLength(0)

        const nonexistantRateResult = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: { input: { rateID: rate.id } },
        })

        expect(nonexistantRateResult.errors).toBeDefined()
        if (!nonexistantRateResult.errors) {
            throw new Error('define errors')
        }
        expect(nonexistantRateResult.errors[0].extensions?.code).toBe(
            'NOT_FOUND'
        )
    })

    it.todo('allows updating a child unlocked rate')
})

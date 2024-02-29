import UPDATE_DRAFT_CONTRACT_RATES from '../../../../app-graphql/src/mutations/updateDraftContractRates.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    createTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
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
            packagesWithSharedRateCerts: [],
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
                                packagesWithSharedRateCerts: [],
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

        expect(true).toBeFalsy()
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
                            id: rate.id,
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: 'RATE_CELL',
                                rateDateStart: '2024-01-01',
                                rateDateEnd: '2025-01-01',
                                amendmentEffectiveDateStart: '2024-02-01',
                                amendmentEffectiveDateEnd: '2025-02-01',
                                rateProgramIDs: ['foo'],

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
                                packagesWithSharedRateCerts: [],
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

        expect(draftRates).toHaveLength(1)

        expect(true).toBeFalsy()
    })
})

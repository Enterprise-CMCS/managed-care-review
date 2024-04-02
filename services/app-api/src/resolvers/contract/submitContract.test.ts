import {
    constructTestPostgresServer,
    createTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import UPDATE_DRAFT_CONTRACT_RATES from '../../../../app-graphql/src/mutations/updateDraftContractRates.graphql'
import SUBMIT_CONTRACT from '../../../../app-graphql/src/mutations/submitContract.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'
import type { SubmitContractInput } from '../../gen/gqlServer'

describe('submitContract', () => {
    it('submits a contract', async () => {
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

        // SUBMIT
        const submitResult = await stateServer.executeOperation({
            query: SUBMIT_CONTRACT,
            variables: {
                input: {
                    contractID: draft.id,
                    submittedReason: 'FIRST POST',
                },
            },
        })

        expect(submitResult.errors).toBeUndefined()
        if (!submitResult.data) {
            throw new Error('no data')
        }

        const contract = submitResult.data.submitContract.contract

        expect(contract.draftContact).toBeUndefined()

        expect(contract.packageSubmissions).toHaveLength(1)

        throw new Error('INCOMEONWE')
    })

    it('returns an error if a CMS user attempts to call submitContract', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const input: SubmitContractInput = {
            contractID: 'fake-id-12345',
            submittedReason: 'Test cms user calling state user func',
        }

        const res = await cmsServer.executeOperation({
            query: SUBMIT_CONTRACT,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'user not authorized to create state data'
        )
    })
})

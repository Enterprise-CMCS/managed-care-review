import { UpdateContractDocument } from '../../gen/gqlClient'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { iterableCmsUsersMockData, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createTestContract,
} from '../../testHelpers/gqlContractHelpers'
describe('updateContract', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            const cmsUser = mockUser()
            it('updates the contract', async () => {
                const stateServer = await constructTestPostgresServer()

                // First, create a new submitted contract
                const contract =
                    await createAndSubmitTestContractWithRate(stateServer)

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                })

                // Update
                const updateResult = await cmsServer.executeOperation({
                    query: UpdateContractDocument,
                    variables: {
                        input: {
                            id: contract.id,
                            mccrsID: '1234',
                        },
                    },
                }, {
                    contextValue: { user: cmsUser },
                })

                expect(updateResult.errors).toBeUndefined()
                const updatedSub = updateResult?.data?.updateContract.contract
                expect(updatedSub.mccrsID).toBe('1234')

                // Remove MCCRSID number
                const updateResultWithNoMCCRSID =
                    await cmsServer.executeOperation({
                        query: UpdateContractDocument,
                        variables: {
                            input: {
                                id: contract.id,
                            },
                        },
                    }, {
                        contextValue: { user: cmsUser },
                    })

                expect(updateResult.errors).toBeUndefined()
                const updatedSubWithNoMCCRSID =
                    updateResultWithNoMCCRSID?.data?.updateContract.contract

                expect(updatedSubWithNoMCCRSID.mccrsID).toBeNull()
            })

            it('errors if the contract is not submitted', async () => {
                const stateServer = await constructTestPostgresServer()

                // First, create a draft submission
                const draftContract = await createTestContract(stateServer)
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                })

                // Attempt update
                const updateResult = await cmsServer.executeOperation({
                    query: UpdateContractDocument,
                    variables: {
                        input: {
                            id: draftContract.id,
                            mccrsID: '1234',
                        },
                    },
                }, {
                    contextValue: { user: cmsUser },
                })
                expect(updateResult.errors).toBeDefined()
                if (updateResult.errors === undefined) {
                    throw new Error('type narrow')
                }

                expect(updateResult.errors[0].extensions?.code).toBe(
                    'BAD_USER_INPUT'
                )
                expect(updateResult.errors[0].message).toBe(
                    `Can not update a contract has not been submitted or unlocked. Fails for contract with ID: ${draftContract.id}`
                )
            })

            it('errors if a State user calls it', async () => {
                const stateServer = await constructTestPostgresServer()

                // First, create a new submitted contract
                const contract =
                    await createAndSubmitTestContractWithRate(stateServer)
                // Update
                const updateResult = await stateServer.executeOperation({
                    query: UpdateContractDocument,
                    variables: {
                        input: {
                            id: contract.id,
                            mccrsID: '1234',
                        },
                    },
                }, {
                    contextValue: { user: testStateUser() },
                })
                expect(updateResult.errors).toBeDefined()
                if (updateResult.errors === undefined) {
                    throw new Error('type narrow')
                }

                expect(updateResult.errors[0].extensions?.code).toBe(
                    'FORBIDDEN'
                )
                expect(updateResult.errors[0].message).toBe(
                    'user not authorized to update contract'
                )
            })
        }
    )
})

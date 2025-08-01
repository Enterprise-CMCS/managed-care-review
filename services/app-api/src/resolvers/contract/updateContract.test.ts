import { UpdateContractDocument } from '../../gen/gqlClient'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { iterableCmsUsersMockData, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'
describe('updateContract', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            const cmsUser = mockUser()
            it('updates the contract', async () => {
                const stateUser = testStateUser()
                const stateServer = await constructTestPostgresServer({
                    context: {
                        user: stateUser,
                    },
                })

                // First, create a new submitted contract
                const contract =
                    await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                })

                // Update
                const response = await cmsServer.executeOperation({
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
                
                const updateResult = extractGraphQLResponse(response)

                expect(updateResult.errors).toBeUndefined()
                const updatedSub = updateResult?.data?.updateContract.contract
                expect(updatedSub.mccrsID).toBe('1234')

                // Remove MCCRSID number
                const responseWithNoMCCRSID =
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
                    
                const updateResultWithNoMCCRSID = extractGraphQLResponse(responseWithNoMCCRSID)

                expect(updateResultWithNoMCCRSID.errors).toBeUndefined()
                const updatedSubWithNoMCCRSID =
                    updateResultWithNoMCCRSID?.data?.updateContract.contract

                expect(updatedSubWithNoMCCRSID.mccrsID).toBeNull()
            })

            it('errors if the contract is not submitted', async () => {
                const stateUser = testStateUser()
                const stateServer = await constructTestPostgresServer({
                    context: {
                        user: stateUser,
                    },
                })

                // First, create a draft submission
                const draftContract = await createTestContract(stateServer, undefined, undefined, { user: stateUser })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                })

                // Attempt update
                const response = await cmsServer.executeOperation({
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
                
                const updateResult = extractGraphQLResponse(response)
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
                const stateUser = testStateUser()
                const stateServer = await constructTestPostgresServer({
                    context: {
                        user: stateUser,
                    },
                })

                // First, create a new submitted contract
                const contract =
                    await createAndSubmitTestContractWithRate(stateServer, undefined, { user: stateUser })
                // Update
                const response = await stateServer.executeOperation({
                    query: UpdateContractDocument,
                    variables: {
                        input: {
                            id: contract.id,
                            mccrsID: '1234',
                        },
                    },
                }, {
                    contextValue: { user: stateUser },
                })
                
                const updateResult = extractGraphQLResponse(response)
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

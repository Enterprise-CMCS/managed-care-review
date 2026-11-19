import { IndexIlosSubmissionsStrippedDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import type {
    ContractStripped,
    ContractStrippedEdge,
} from '../../gen/gqlClient'
import { testCMSUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndSubmitTestILOSContract,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestILOSContract,
} from '../../testHelpers/gqlContractHelpers'

describe('indexIlosSubmissionsStripped', () => {
    it('returns draft and submitted ILOS submissions for state users and no other contracts', async () => {
        const stateServer = await constructTestPostgresServer()

        const healthPlanDraft =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const healthPlan =
            await createAndSubmitTestContractWithRate(stateServer)
        const ilosDraft = await createAndUpdateTestILOSContract(stateServer)
        const ilos = await createAndSubmitTestILOSContract(stateServer)

        const result = await executeGraphQLOperation(stateServer, {
            query: IndexIlosSubmissionsStrippedDocument,
        })
        expect(result.errors).toBeUndefined()

        const submissions: ContractStripped[] =
            result.data?.indexIlosSubmissionsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const submissionIDs = submissions.map((sub) => sub.id)

        expect(submissionIDs).toContain(ilosDraft.id)
        expect(submissionIDs).toContain(ilos.id)
        expect(submissionIDs).not.toContain(healthPlanDraft.id)
        expect(submissionIDs).not.toContain(healthPlan.id)
        expect(
            submissions.every((sub) => sub.contractSubmissionType === 'ILOS')
        ).toBe(true)
    })

    it('returns only submitted ILOS submissions for CMS users', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const healthPlan =
            await createAndSubmitTestContractWithRate(stateServer)
        const ilosDraft = await createAndUpdateTestILOSContract(stateServer)
        const ilos = await createAndSubmitTestILOSContract(stateServer)

        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexIlosSubmissionsStrippedDocument,
        })
        expect(result.errors).toBeUndefined()

        const submissions: ContractStripped[] =
            result.data?.indexIlosSubmissionsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const submissionIDs = submissions.map((sub) => sub.id)

        expect(submissionIDs).toContain(ilos.id)
        expect(submissionIDs).not.toContain(ilosDraft.id)
        expect(submissionIDs).not.toContain(healthPlan.id)
        expect(
            submissions.every((sub) => sub.contractSubmissionType === 'ILOS')
        ).toBe(true)
    })
})

import { CreateHealthPlanPackageInput } from '../../gen/gqlServer'
import CREATE_HEALTH_PLAN_PACKAGE from '@managed-care-review/app-graphql/src/mutations/createHealthPlanPackage.graphql'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'

describe('createHealthPlanPackage', () => {
    it('returns package with unlocked form data', async () => {
        const server = await constructTestPostgresServer()

        const input: CreateHealthPlanPackageInput = {
            programIDs: [
                '5c10fe9f-bec9-416f-a20c-718b152ad633',
                '037af66b-81eb-4472-8b80-01edf17d12d9',
            ],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
        }
        const res = await server.executeOperation({
            query: CREATE_HEALTH_PLAN_PACKAGE,
            variables: { input },
        })

        expect(res.errors).toBeUndefined()

        const pkg = res.data?.createHealthPlanPackage.pkg
        const draft = latestFormData(pkg)

        expect(draft.submissionDescription).toBe('A real submission')
        expect(draft.submissionType).toBe('CONTRACT_ONLY')
        expect(draft.programIDs).toEqual([
            '5c10fe9f-bec9-416f-a20c-718b152ad633',
            '037af66b-81eb-4472-8b80-01edf17d12d9',
        ])
        expect(draft.documents).toHaveLength(0)
        expect(draft.managedCareEntities).toHaveLength(0)
        expect(draft.federalAuthorities).toHaveLength(0)
        expect(draft.contractDateStart).toBeUndefined()
        expect(draft.contractDateEnd).toBeUndefined()
    })

    it('returns an error if the program id is not in valid', async () => {
        const server = await constructTestPostgresServer()
        const input: CreateHealthPlanPackageInput = {
            programIDs: ['xyz123'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
        }
        const res = await server.executeOperation({
            query: CREATE_HEALTH_PLAN_PACKAGE,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'The program id xyz123 does not exist in state FL'
        )
    })

    it('returns an error if a CMS user attempts to create', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const input: CreateHealthPlanPackageInput = {
            programIDs: ['xyz123'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
        }
        const res = await server.executeOperation({
            query: CREATE_HEALTH_PLAN_PACKAGE,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'user not authorized to create state data'
        )
    })
})

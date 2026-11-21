import type { GraphQLResolveInfo } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import type { Store } from '../../postgres'
import { fetchEBContractorsResolver } from './fetchEBContractors'

const context: Context = {
    user: {
        id: 'state-user',
        role: 'STATE_USER',
        email: 'state@example.com',
        givenName: 'State',
        familyName: 'User',
        stateCode: 'FL',
    },
}

describe('fetchEBContractors', () => {
    const contractors = [
        { id: 'table-id', name: 'Table Contractor', isDeprecated: true },
    ]
    const findEBContractors = vi.fn<Store['findEBContractors']>()
    const resolver = fetchEBContractorsResolver({
        findEBContractors,
    } as unknown as Store)
    const execute = async (ctx = context, includeDeprecated = false) => {
        if (typeof resolver !== 'function')
            throw new Error('Expected resolver function')
        const result = await resolver(
            {},
            { includeDeprecated },
            ctx,
            {} as GraphQLResolveInfo
        )
        return Promise.all(result)
    }
    beforeEach(() => {
        findEBContractors.mockReset()
        findEBContractors.mockResolvedValue(contractors)
    })

    it('allows state users to read the contractor list from the store', async () => {
        expect(await execute()).toEqual(contractors)
        expect(findEBContractors).toHaveBeenCalledOnce()
        expect(findEBContractors).toHaveBeenCalledWith(false)
    })
    it.each([false, true])(
        'passes includeDeprecated=%s to the store',
        async (includeDeprecated) => {
            await execute(context, includeDeprecated)
            expect(findEBContractors).toHaveBeenCalledWith(
                includeDeprecated ?? false
            )
        }
    )
    it('returns an empty list when the table is empty', async () => {
        findEBContractors.mockResolvedValue([])
        expect(await execute()).toEqual([])
    })
    it('allows CMS users and OAuth clients with read access', async () => {
        const cmsContext: Context = {
            user: {
                id: 'cms-user',
                role: 'CMS_USER',
                email: 'cms@example.com',
                givenName: 'CMS',
                familyName: 'User',
                divisionAssignment: 'DMCO',
                stateAssignments: [],
            },
            oauthClient: {
                clientId: 'client',
                iss: 'test',
                grants: ['client_credentials'],
                scopes: [],
                isDelegatedUser: false,
            },
        }
        expect(await execute(cmsContext)).toEqual(contractors)
    })
    it('rejects OAuth clients without read access before querying the table', async () => {
        await expect(
            execute({
                ...context,
                oauthClient: {
                    clientId: 'client',
                    iss: 'test',
                    grants: [],
                    scopes: [],
                    isDelegatedUser: false,
                },
            })
        ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } })
        expect(findEBContractors).not.toHaveBeenCalled()
    })
    it('reports lookup failures as server errors', async () => {
        findEBContractors.mockResolvedValue(new Error('Database unavailable'))
        await expect(execute()).rejects.toMatchObject({
            extensions: { code: 'INTERNAL_SERVER_ERROR', cause: 'DB_ERROR' },
        })
    })
})

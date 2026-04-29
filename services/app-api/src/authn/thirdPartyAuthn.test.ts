import { userFromThirdPartyAuthorizer } from './thirdPartyAuthn'
import { lookupUserAurora } from './cognitoAuthn'
import type { Store } from '../postgres'
import type { CMSUserType } from '../domain-models'

vi.mock('./cognitoAuthn', () => ({
    lookupUserAurora: vi.fn(),
}))

vi.mock('../otel/otel_handler', () => ({
    initTracer: vi.fn(),
    recordException: vi.fn(),
}))

const mockLookupUserAurora = vi.mocked(lookupUserAurora)

const mockStore = {} as Store

const cmsUser = (overrides: Partial<CMSUserType> = {}): CMSUserType => ({
    id: 'cms-user-1',
    role: 'CMS_USER',
    email: 'cms@example.com',
    givenName: 'CMS',
    familyName: 'User',
    stateAssignments: [],
    ...overrides,
})

describe('userFromThirdPartyAuthorizer', () => {
    it('returns the delegated CMS user and defaults divisionAssignment to DMCO', async () => {
        const delegatedUser = cmsUser({
            id: 'delegated-cms-user',
            divisionAssignment: undefined,
        })
        mockLookupUserAurora.mockResolvedValue(delegatedUser)

        const result = await userFromThirdPartyAuthorizer(
            mockStore,
            'oauth-test',
            delegatedUser.id
        )

        expect(mockLookupUserAurora).toHaveBeenCalledWith(
            mockStore,
            delegatedUser.id
        )
        expect(result).toEqual({
            ...delegatedUser,
            divisionAssignment: 'DMCO',
        })
    })
})

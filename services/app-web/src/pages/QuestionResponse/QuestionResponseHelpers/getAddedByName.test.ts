import {
    mockValidAdminUser,
    mockValidCMSUser,
    mockValidStateUser,
} from '@mc-review/mocks'
import { User } from '../../../gen/gqlClient'
import { getAddedByName } from './questionResponseHelpers'

describe('getAddedByName', () => {
    const stateViewer = mockValidStateUser({ id: 'viewer-id' }) as User
    const cmsViewer = mockValidCMSUser({ id: 'viewer-id' }) as User

    it('returns "You" when the viewer authored the entry', () => {
        const author = mockValidAdminUser({ id: 'viewer-id' }) as User
        expect(getAddedByName(stateViewer, author)).toBe('You')
    })

    it.each([
        {
            description: 'an admin author is marked (Admin)',
            author: mockValidAdminUser({
                id: 'admin-1',
                givenName: 'Avery',
            }) as User,
            expected: 'Avery (Admin)',
        },
        {
            description: 'a state author shows their state code',
            author: mockValidStateUser({
                id: 'state-1',
                givenName: 'Sam',
            }) as User,
            expected: 'Sam (MN)',
        },
        {
            description: 'a CMS author shown to a state viewer is marked (CMS)',
            author: mockValidCMSUser({
                id: 'cms-1',
                givenName: 'Casey',
            }) as User,
            expected: 'Casey (CMS)',
        },
    ])('$description', ({ author, expected }) => {
        expect(getAddedByName(stateViewer, author)).toBe(expected)
    })

    it('does not append (CMS) when the viewer is also CMS', () => {
        const author = mockValidCMSUser({
            id: 'cms-2',
            givenName: 'Casey',
        }) as User
        expect(getAddedByName(cmsViewer, author)).toBe('Casey ')
    })
})

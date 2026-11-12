import {
    testAdminUser,
    testBusinessOwnerUser,
    testCMSApproverUser,
    testCMSUser,
    testHelpdeskUser,
    testReadOnlyUser,
    testStateUser,
} from './userFactories'

// Importing a pure fixture must never evaluate either database module.
vi.mock('../postgres', () => {
    throw new Error('User factories must not import postgres')
})
vi.mock('./storeHelpers', () => {
    throw new Error('User factories must not import database helpers')
})

const cases = [
    {
        role: 'CMS_USER',
        factory: testCMSUser,
        defaults: {
            email: 'zuko@example.com',
            familyName: 'Zuko',
            givenName: 'Prince',
            divisionAssignment: 'DMCO',
            stateAssignments: [],
        },
    },
    {
        role: 'CMS_APPROVER_USER',
        factory: testCMSApproverUser,
        defaults: {
            email: 'azula@example.com',
            familyName: 'Azula',
            givenName: 'Princess',
            divisionAssignment: 'DMCO',
            stateAssignments: [],
        },
    },
    {
        role: 'STATE_USER',
        factory: testStateUser,
        defaults: {
            email: 'james@example.com',
            familyName: 'Brown',
            givenName: 'James',
            stateCode: 'FL',
        },
    },
    {
        role: 'ADMIN_USER',
        factory: testAdminUser,
        defaults: {
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        },
    },
    {
        role: 'BUSINESSOWNER_USER',
        factory: testBusinessOwnerUser,
        defaults: {
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        },
    },
    {
        role: 'HELPDESK_USER',
        factory: testHelpdeskUser,
        defaults: {
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        },
    },
    {
        role: 'READONLY_USER',
        factory: testReadOnlyUser,
        defaults: {
            email: 'gyatso@example.com',
            familyName: 'Monk',
            givenName: 'Gyatso',
        },
    },
] as const

describe('pure user factories', () => {
    it.each(cases)(
        'preserves $role defaults and generates fresh IDs',
        ({ role, factory, defaults }) => {
            const user = factory()
            expect(user).toEqual({ id: expect.any(String), role, ...defaults })
            expect(user.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            )
            expect(factory().id).not.toBe(user.id)
        }
    )

    it.each(cases)(
        'preserves $role caller overrides',
        ({ role, factory, defaults }) => {
            const overrides = {
                id: 'custom-user',
                email: 'custom@example.com',
                givenName: 'Custom',
                familyName: 'Person',
            }
            expect(factory(overrides)).toEqual({
                role,
                ...defaults,
                ...overrides,
            })
        }
    )

    it('keeps role-specific overrides and independent assignment arrays', () => {
        expect(testStateUser({ stateCode: 'MN' }).stateCode).toBe('MN')
        expect(
            testCMSUser({ divisionAssignment: undefined }).divisionAssignment
        ).toBeUndefined()
        expect(testCMSUser().stateAssignments).not.toBe(
            testCMSUser().stateAssignments
        )
        expect(testCMSApproverUser().stateAssignments).not.toBe(
            testCMSApproverUser().stateAssignments
        )
    })
})

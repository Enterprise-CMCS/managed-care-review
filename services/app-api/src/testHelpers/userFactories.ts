// Pure user fixtures: importing this module does not initialize database helpers.
// userHelpers re-exports these factories for existing database-backed tests.
import type {
    AdminUserType,
    CMSApproverUserType,
    CMSUserType,
    StateUserType,
    BusinessOwnerUserType,
    HelpdeskUserType,
    ReadOnlyUserType,
} from '../domain-models'
import { v4 as uuidv4 } from 'uuid'

const testCMSUser = (userData?: Partial<CMSUserType>): CMSUserType => ({
    id: uuidv4(),
    role: 'CMS_USER',
    email: 'zuko@example.com',
    familyName: 'Zuko',
    givenName: 'Prince',
    divisionAssignment: 'DMCO' as const,
    stateAssignments: [],
    ...userData,
})

const testCMSApproverUser = (
    userData?: Partial<CMSApproverUserType>
): CMSApproverUserType => ({
    id: uuidv4(),
    role: 'CMS_APPROVER_USER',
    email: 'azula@example.com',
    familyName: 'Azula',
    givenName: 'Princess',
    divisionAssignment: 'DMCO' as const,
    stateAssignments: [],
    ...userData,
})

const testStateUser = (userData?: Partial<StateUserType>): StateUserType => ({
    id: uuidv4(),
    stateCode: 'FL',
    role: 'STATE_USER',
    email: 'james@example.com',
    familyName: 'Brown',
    givenName: 'James',
    ...userData,
})

const testAdminUser = (userData?: Partial<AdminUserType>): AdminUserType => ({
    id: uuidv4(),
    role: 'ADMIN_USER',
    email: 'iroh@example.com',
    familyName: 'Iroh',
    givenName: 'Uncle',
    ...userData,
})

const testBusinessOwnerUser = (
    userData?: Partial<BusinessOwnerUserType>
): BusinessOwnerUserType => ({
    id: uuidv4(),
    role: 'BUSINESSOWNER_USER',
    email: 'iroh@example.com',
    familyName: 'Iroh',
    givenName: 'Uncle',
    ...userData,
})

const testHelpdeskUser = (
    userData?: Partial<HelpdeskUserType>
): HelpdeskUserType => ({
    id: uuidv4(),
    role: 'HELPDESK_USER',
    email: 'iroh@example.com',
    familyName: 'Iroh',
    givenName: 'Uncle',
    ...userData,
})

const testReadOnlyUser = (
    userData?: Partial<ReadOnlyUserType>
): ReadOnlyUserType => ({
    id: uuidv4(),
    role: 'READONLY_USER',
    email: 'gyatso@example.com',
    familyName: 'Monk',
    givenName: 'Gyatso',
    ...userData,
})

export {
    testAdminUser,
    testStateUser,
    testCMSUser,
    testCMSApproverUser,
    testBusinessOwnerUser,
    testHelpdeskUser,
    testReadOnlyUser,
}

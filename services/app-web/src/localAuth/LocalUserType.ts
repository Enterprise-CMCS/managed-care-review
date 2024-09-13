import { StateType } from '@mc-review/hpp'
import { Division } from '../pages/QuestionResponse/QATable/QATable'

type LocalUserType =
    | LocalStateUserType
    | LocalCMSUserType
    | LocalAdminUserType
    | LocalHelpdeskUserType
    | LocalBusinessOwnerUserType
    | LocalCMSApproverType

type LocalStateUserType = {
    id: string
    role: 'STATE_USER'
    email: string
    stateCode: string
    givenName: string
    familyName: string
}

type LocalCMSUserType = {
    id: string
    role: 'CMS_USER'
    email: string
    givenName: string
    familyName: string
    stateAssignments: StateType[]
    divisionAssignment?: Division
}

type LocalAdminUserType = {
    id: string
    role: 'ADMIN_USER'
    email: string
    givenName: string
    familyName: string
}

type LocalHelpdeskUserType = {
    id: string
    role: 'HELPDESK_USER'
    email: string
    givenName: string
    familyName: string
}

type LocalBusinessOwnerUserType = {
    id: string
    role: 'BUSINESSOWNER_USER'
    email: string
    givenName: string
    familyName: string
}

type LocalCMSApproverType = {
    id: string
    role: 'CMS_APPROVER_USER'
    email: string
    givenName: string
    familyName: string
    stateAssignments: StateType[]
    divisionAssignment?: Division
}

function isLocalUser(user: unknown): user is LocalUserType {
    if (user && typeof user === 'object') {
        if ('role' in user) {
            const roleUser = user as { role: unknown }
            if (typeof roleUser.role === 'string') {
                if (
                    roleUser.role === 'STATE_USER' ||
                    roleUser.role === 'CMS_USER' ||
                    roleUser.role === 'ADMIN_USER' ||
                    roleUser.role === 'HELPDESK_USER' ||
                    roleUser.role === 'BUSINESSOWNER_USER' ||
                    roleUser.role === 'CMS_APPROVER_USER'
                ) {
                    return true
                }
            }
        }
    }

    return false
}

export type { LocalUserType }

export { isLocalUser }

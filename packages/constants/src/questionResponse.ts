import { ConsolidatedContractStatus } from './gen/gqlClient'

const adminResponseAllowedStatuses: ConsolidatedContractStatus[] = [
    'UNLOCKED',
    'SUBMITTED',
    'RESUBMITTED',
    'APPROVED',
] as const

const isAdminQuestionResponseAllowedStatus = (
    status: string | undefined | null
): boolean =>
    !!status &&
    adminResponseAllowedStatuses.some(
        (allowedStatus) => allowedStatus === status
    )

export { adminResponseAllowedStatuses, isAdminQuestionResponseAllowedStatus }

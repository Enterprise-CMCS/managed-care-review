import { ConsolidatedRateStatus } from './gen/gqlClient'

const ConsolidatedRateStatusRecord: Record<ConsolidatedRateStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    RESUBMITTED: 'Submitted',
    UNLOCKED: 'Unlocked',
    WITHDRAWN: 'Withdrawn'
}

export { ConsolidatedRateStatusRecord }

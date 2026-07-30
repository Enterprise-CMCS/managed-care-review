import { formatCalendarDate } from '@mc-review/dates'
import type { RevisionDiff } from '../../domain-models'

type ResubmitRevisionChanges = {
    previousSubmissionDate: string
    currentSubmissionDate: string
    hasChanges: boolean
}

const EMAIL_TIMEZONE = 'America/Los_Angeles'

const buildResubmitRevisionChanges = (
    comparison: RevisionDiff
): ResubmitRevisionChanges | undefined => {
    if (comparison.fieldChanges.length > 0) {
        return undefined
    }

    return {
        previousSubmissionDate: formatCalendarDate(
            comparison.olderSubmittedAt,
            EMAIL_TIMEZONE
        ),
        currentSubmissionDate: formatCalendarDate(
            comparison.newerSubmittedAt,
            EMAIL_TIMEZONE
        ),
        hasChanges: false,
    }
}

export { buildResubmitRevisionChanges, type ResubmitRevisionChanges }

import { DraftSubmission, StateSubmission } from '../gen/gqlClient'

const isStateSubmission = (
    submission: DraftSubmission | StateSubmission
): submission is StateSubmission => {
    if (submission.__typename === 'StateSubmission') {
        return true
    } else return false
}

export { isStateSubmission }

import { useParams } from 'react-router-dom'
import { recordJSException } from '@mc-review/otel'
import { useCurrentRoute } from './useCurrentRoute'
import {
    ContractSubmissionTypeParams,
    STATE_SUBMISSION_FORM_ROUTES,
} from '@mc-review/constants'

// Wraps react-router useParams in better DX and types so we catch invalid param names early
// original useParams will returns an object of key/value pairs of the dynamic params from the current URL that were matched by the route path.

type UseRouteParams = {
    id?: string // Add any dynamic params to this list - should match :param usage in RoutesRecord dictionary
    contractSubmissionType?: ContractSubmissionTypeParams
    rateID?: string
}

const useRouteParams = (): UseRouteParams => {
    const { id, contractSubmissionType, rateID } = useParams<UseRouteParams>()
    const { currentRoute } = useCurrentRoute()
    if (!id) {
        if (STATE_SUBMISSION_FORM_ROUTES.includes(currentRoute)) {
            const errorMessage =
                'Unexpected Error: useRouteParams = id param not set.'
            recordJSException(errorMessage)
        }
    }
    if (!contractSubmissionType) {
        if (STATE_SUBMISSION_FORM_ROUTES.includes(currentRoute)) {
            const errorMessage =
                'Unexpected Error: useRouteParams = contractSubmissionType param not set.'
            recordJSException(errorMessage)
        }
    }
    if (!rateID) {
        if (STATE_SUBMISSION_FORM_ROUTES.includes(currentRoute)) {
            const errorMessage =
                'Unexpected Error: useRouteParams = rateID param not set.'
            recordJSException(errorMessage)
        }
    }
    return { id, contractSubmissionType, rateID }
}

export { useRouteParams }
export type { UseRouteParams }

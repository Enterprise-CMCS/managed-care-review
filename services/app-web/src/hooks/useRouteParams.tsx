import { useParams } from 'react-router-dom'
import { recordJSException } from '../otelHelpers'

// Wraps react-router useParams in better DX and types so we catch invalid param names early
// original useParams will returns an object of key/value pairs of the dynamic params from the current URL that were matched by the route path.

type UseRouteParams = {
    id: string // Add any dynamic params to this list - should match :param usage in RoutesRecord dictionary
}

const useRouteParams = (): UseRouteParams => {
    const { id } = useParams<keyof UseRouteParams>()

    if (!id) {
        const errorMessage =
            'Unexpected Error: useRouteParams = id param not set.'
        recordJSException(errorMessage)
        return { id: 'INVALID_CHECK_PARAMS' }
    }
    return { id }
}

export { useRouteParams }
export type { UseRouteParams }

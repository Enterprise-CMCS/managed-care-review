import React from 'react'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { Loading } from '../../../components'
import { ErrorInvalidSubmissionStatus } from '../../Errors/ErrorInvalidSubmissionStatusPage'
import { Error404 } from '../../Errors/Error404Page'
import { handleApolloError, toGQLError } from '@mc-review/helpers'
import { ErrorForbiddenPage } from '../../Errors/ErrorForbiddenPage'
import type { ErrorLike } from '@apollo/client'

type InterimState =
    | 'LOADING'
    | 'GENERIC_ERROR'
    | 'NOT_FOUND'
    | 'INVALID_STATUS'
    | 'FORBIDDEN'
type ErrorOrLoadingPageProps = {
    state?: InterimState
}

const handleAndReturnErrorState = (error: ErrorLike | Error): InterimState => {
    handleApolloError(error, true)
    const gqlError = toGQLError(error)
    if (gqlError?.extensions.code === 'NOT_FOUND') {
        return 'NOT_FOUND'
    } else if (gqlError?.extensions.code === 'FORBIDDEN_ERROR') {
        return 'FORBIDDEN'
    }
    return 'GENERIC_ERROR'
}
const ErrorOrLoadingPage = ({
    state,
}: ErrorOrLoadingPageProps): React.ReactElement => {
    switch (state) {
        case 'LOADING':
            return <Loading fullPage />
        case 'GENERIC_ERROR':
            return <GenericErrorPage />
        case 'NOT_FOUND':
            return <Error404 />
        case 'FORBIDDEN':
            return <ErrorForbiddenPage />
        case 'INVALID_STATUS':
            return <ErrorInvalidSubmissionStatus />
        default:
            return <GenericErrorPage />
    }
}

export { ErrorOrLoadingPage, handleAndReturnErrorState }
export type { InterimState, ErrorOrLoadingPageProps }

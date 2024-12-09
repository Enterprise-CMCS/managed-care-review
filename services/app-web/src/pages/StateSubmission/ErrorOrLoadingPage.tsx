import React from 'react'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { GridContainer } from '@trussworks/react-uswds'
import { Loading } from '../../components'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatusPage'
import { Error404 } from '../Errors/Error404Page'
import { handleApolloError } from '@mc-review/helpers'
import { ApolloError } from '@apollo/client'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'

type InterimState =
    | 'LOADING'
    | 'GENERIC_ERROR'
    | 'NOT_FOUND'
    | 'INVALID_STATUS'
    | 'FORBIDDEN'
type ErrorOrLoadingPageProps = {
    state?: InterimState
}

const handleAndReturnErrorState = (error: ApolloError): InterimState => {
    handleApolloError(error, true)
    if (error.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
        return 'NOT_FOUND'
    } else if (error.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN_ERROR') {
        return 'FORBIDDEN'
    } else {
        return 'GENERIC_ERROR'
    }
}
const ErrorOrLoadingPage = ({
    state,
}: ErrorOrLoadingPageProps): React.ReactElement => {
    switch (state) {
        case 'LOADING':
            return (
                <GridContainer>
                    <Loading />
                </GridContainer>
            )
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

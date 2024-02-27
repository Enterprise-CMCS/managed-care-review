import React from 'react'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { GridContainer } from '@trussworks/react-uswds'
import { Loading } from '../../components'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatusPage'
import { Error404 } from '../Errors/Error404Page'

type InterimState = 'LOADING' | 'GENERIC_ERROR' | 'NOT_FOUND' | 'INVALID_STATUS'
type ErrorOrLoadingPageProps = {
    state: 'LOADING' | 'GENERIC_ERROR' | 'NOT_FOUND' | 'INVALID_STATUS'
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
        case 'INVALID_STATUS':
            return <ErrorInvalidSubmissionStatus />
        default:
            return <GenericErrorPage />
    }
}

export { ErrorOrLoadingPage }
export type { InterimState, ErrorOrLoadingPageProps }

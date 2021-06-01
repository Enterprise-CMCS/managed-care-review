import React, { useEffect } from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams, useLocation } from 'react-router-dom'

import { Error404 } from '../Errors/Error404'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatus'
import { GenericError } from '../Errors/GenericError'
import { Loading } from '../../components/Loading/'
import { usePage } from '../../contexts/PageContext'
import { RoutesRecord } from '../../constants/routes'
import { ContractDetails } from './ContractDetails/ContractDetails'
import { Documents } from './Documents/Documents'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType/SubmissionType'

import { useFetchDraftSubmissionQuery } from '../../gen/gqlClient'

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { updateHeading } = usePage()

    const { data, loading, error } = useFetchDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })
    const draft = data?.fetchDraftSubmission?.draftSubmission

    useEffect(() => {
        updateHeading(pathname, draft?.name)
    }, [updateHeading, pathname, draft])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error) {
        console.log('error loading draft:', error)
        if (error.message.includes('not a DraftSubmission')) {
            return <ErrorInvalidSubmissionStatus />
        }
        return <GenericError />
    }

    if (draft === undefined || draft === null) {
        return <Error404 />
    }

    return (
        <GridContainer>
            <Switch>
                <Route path={RoutesRecord.SUBMISSIONS_TYPE}>
                    <SubmissionType draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}>
                    <ContractDetails draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_DOCUMENTS}>
                    <Documents draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}>
                    <ReviewSubmit draftSubmission={draft} />
                </Route>
            </Switch>
        </GridContainer>
    )
}

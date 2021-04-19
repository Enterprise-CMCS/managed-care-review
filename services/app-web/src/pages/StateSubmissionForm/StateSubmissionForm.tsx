import React, { useEffect } from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams } from 'react-router-dom'

import { Error404 } from '../Errors/Error404'
import { GenericError } from '../Errors/GenericError'
import { Loading } from '../../components/Loading/'
import { usePage } from '../../contexts/PageContext'
import { RoutesRecord } from '../../constants/routes'
import { ContractDetails } from './ContractDetails/ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'

import { useFetchDraftSubmissionQuery } from '../../gen/gqlClient'

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()

    const { updateHeading } = usePage()

    const { data, loading, error } = useFetchDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    useEffect(() => {
        // We have to updateHeading inside useEffect so that we don't update two components at the same time
        const draft = data?.fetchDraftSubmission?.draftSubmission
        if (draft) {
            updateHeading(draft.name)
        }
    }, [data, updateHeading])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error) {
        console.log('error loading draft:', error)
        return <GenericError />
    }

    const draft = data?.fetchDraftSubmission?.draftSubmission

    if (draft === undefined || draft === null) {
        console.log('got undefined back from loaded showDraftSubmission')
        return <Error404 />
    }

    return (
        <GridContainer>
            <Switch>
                <Route
                    path={RoutesRecord.SUBMISSIONS_TYPE}
                    render={(props) => (
                        <SubmissionType draftSubmission={draft} {...props} />
                    )}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                    component={ContractDetails}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    component={ReviewSubmit}
                />
            </Switch>
        </GridContainer>
    )
}

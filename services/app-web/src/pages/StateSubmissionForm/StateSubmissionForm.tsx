import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams } from 'react-router-dom'

import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { Routes } from '../../constants/routes'

import { useShowDraftSubmissionQuery } from '../../gen/gqlClient'

const StateSubmissionEditingForm = (): React.ReactElement => {
    console.log('EDITING FORM')

    const { id } = useParams<{ id: string }>()

    const { data, loading, error } = useShowDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    console.log('LOADIN', loading, data, error)

    if (loading) {
        return <div>Loading...</div>
    }

    if (error) {
        console.log('error loading draft:', error)
        return <div>Error loading submission to edit!</div>
    }

    const draft = data?.showDraftSubmission?.draftSubmission

    if (draft === undefined || draft === null) {
        return <div>Error loading submission to edit!</div>
    }

    return (
        <Switch>
            <Route
                path={Routes.SUBMISSIONS_TYPE}
                render={(props) => (
                    <SubmissionType initialValues={draft} {...props} />
                )}
            />
            <Route
                path={Routes.SUBMISSIONS_CONTRACT_DETAILS}
                component={ContractDetails}
            />
            <Route
                path={Routes.SUBMISSIONS_REVIEW_SUBMIT}
                component={ReviewSubmit}
            />
        </Switch>
    )
}

// There are two very different phases of the form that happen to reuse an element.
// /new is for starting out
// everything else hangs off of /submissions/:id, so let's have a component for that
// where we can put the useQuery
export const StateSubmissionForm = (): React.ReactElement => {
    return (
        <GridContainer>
            <Switch>
                <Route
                    path={Routes.SUBMISSIONS_NEW}
                    component={SubmissionType}
                />
                <Route
                    path={Routes.SUBMISSIONS_EDIT}
                    component={StateSubmissionEditingForm}
                />
            </Switch>
        </GridContainer>
    )
}

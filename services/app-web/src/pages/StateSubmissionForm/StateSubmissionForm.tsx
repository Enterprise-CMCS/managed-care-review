import React, { useEffect } from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams } from 'react-router-dom'

import { usePage } from '../../contexts/PageContext'
import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { RoutesRecord } from '../../constants/routes'

import { useShowDraftSubmissionQuery } from '../../gen/gqlClient'

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    if (id === undefined) {
        return <div>notyet</div>
    }
    const { updateHeading } = usePage()

    const { data, loading, error } = useShowDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    useEffect(() => {
        // We have to updateHeading inside useEffect so that we don't update two components at the same time
        const draft = data?.showDraftSubmission?.draftSubmission
        if (draft) {
            updateHeading(draft.name)
        }
    }, [data])

    if (loading) {
        return <div>Loading...</div>
    }

    if (error) {
        console.log('error loading draft:', error)
        return <div>Error loading submission to edit!</div>
    }

    const draft = data?.showDraftSubmission?.draftSubmission

    if (draft === undefined || draft === null) {
        console.log('got undefined back from showDraftSubmission')
        return <div>Error loading submission to edit!</div>
    }

    return (
        <GridContainer>
            <Switch>
                <Route
                    path={RoutesRecord.SUBMISSIONS_TYPE}
                    render={(props) => (
                        <SubmissionType initialValues={draft} {...props} />
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

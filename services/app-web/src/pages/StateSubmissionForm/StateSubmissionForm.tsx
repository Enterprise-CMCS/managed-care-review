import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route } from 'react-router-dom'

import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { useLocation } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { RoutesRecord } from '../../constants/routes'

export const StateSubmissionForm = (): React.ReactElement => {
    const { pathname } = useLocation()
    const { updateHeading } = usePage()
    const isNewSubmission = pathname === RoutesRecord.SUBMISSIONS_NEW

    React.useEffect(() => {
        if (!isNewSubmission) {
            // get draft submission, pass in data to the appropriate page, and update heading
            updateHeading('CUSTOM-SUBMISSION--OO1')
        }

        return function cleanup() {
            updateHeading(undefined)
        }
    })

    return (
        <GridContainer>
            <Switch>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW}
                    component={SubmissionType}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_TYPE}
                    component={SubmissionType}
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

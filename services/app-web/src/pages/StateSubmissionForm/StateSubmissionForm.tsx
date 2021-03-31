import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route } from 'react-router-dom'

import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { RoutesRecord } from '../../constants/routes'

export const StateSubmissionForm = (): React.ReactElement => {
    // TODO: move handling of page heading to this level once we have more pages
    // const { pathname } = useLocation()
    // const { updateHeading } = usePage()
    // const isNewSubmission = pathname === RoutesRecord.SUBMISSIONS_NEW

    // React.useEffect(() => {
    //     if (!isNewSubmission) {
    //         // updateHeading('CUSTOM-SUBMISSION--OO1')
    //     }

    //     return function cleanup() {
    //         updateHeading(undefined)
    //     }
    // })

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

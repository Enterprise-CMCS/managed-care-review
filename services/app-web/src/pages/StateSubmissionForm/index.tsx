import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route } from 'react-router-dom'

import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit'
import { SubmissionType } from './SubmissionType/SubmissionType'

// // Main component setup

// const steps = ['SUBMISSION_TYPE', 'CONTRACT_DETAILS'] as const
// type StateSubmissionFormSteps = typeof steps[number] // iterable union type

// const stepsWithName: { [K in StateSubmissionFormSteps]: string } = {
//     SUBMISSION_TYPE: 'Submission type',
//     CONTRACT_DETAILS: 'Contract details',
// }

export const StateSubmissionForm = (): React.ReactElement => (
    <GridContainer>
        <Switch>
            <Route path="/submissions/new" component={SubmissionType} />
            <Route
                path="/submissions/:submission_id/type"
                component={SubmissionType}
            />
            <Route
                path="/submissions/:submission_id/contract-details"
                component={ContractDetails}
            />
            <Route
                path="/submissions/:submission_id/review-and-submit"
                component={ReviewSubmit}
            />
        </Switch>
    </GridContainer>
)

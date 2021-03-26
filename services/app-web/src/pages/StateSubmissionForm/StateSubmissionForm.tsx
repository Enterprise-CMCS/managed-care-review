import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route } from 'react-router-dom'

import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { Routes } from '../../constants/routes'

export const StateSubmissionForm = (): React.ReactElement => (
    <GridContainer>
        <Switch>
            <Route path={Routes.SUBMISSIONS_NEW} component={SubmissionType} />
            <Route path={Routes.SUBMISSIONS_TYPE} component={SubmissionType} />
            <Route
                path={Routes.SUBMISSIONS_CONTRACT_DETAILS}
                component={ContractDetails}
            />
            <Route
                path={Routes.SUBMISSIONS_REVIEW_SUBMIT}
                component={ReviewSubmit}
            />
        </Switch>
    </GridContainer>
)

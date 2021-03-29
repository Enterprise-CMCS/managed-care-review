import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Switch, Route } from 'react-router-dom'

import { ContractDetails } from './ContractDetails'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { useLocation } from 'react-router-dom'

import { useTitle } from '../../hooks/useTitle'
import {
    getRouteName,
    PageTitlesRecord,
    RoutesRecord,
} from '../../constants/routes'

// TODO: Add form Step X of X for dynamic titles once Step Indicator is added.
const generatePageTitle = (pathname: string): string | undefined => {
    const route = getRouteName(pathname)
    switch (route) {
        case 'SUBMISSIONS_NEW':
            return PageTitlesRecord.SUBMISSIONS_NEW
        case 'SUBMISSIONS_TYPE':
            return PageTitlesRecord.SUBMISSIONS_TYPE

        case 'SUBMISSIONS_CONTRACT_DETAILS':
            return PageTitlesRecord.SUBMISSIONS_CONTRACT_DETAILS

        case 'SUBMISSIONS_RATE_DETAILS':
            return PageTitlesRecord.SUBMISSIONS_RATE_DETAILS
        case 'SUBMISSIONS_CONTACTS':
            return PageTitlesRecord.SUBMISSIONS_CONTACTS
        case 'SUBMISSIONS_DOCUMENTS':
            return PageTitlesRecord.SUBMISSIONS_DOCUMENTS
        case 'SUBMISSIONS_REVIEW_SUBMIT':
            return PageTitlesRecord.SUBMISSIONS_REVIEW_SUBMIT
        default:
            return undefined
    }
}
export const StateSubmissionForm = (): React.ReactElement => {
    const { pathname } = useLocation()
    useTitle(generatePageTitle(pathname))
    // const shouldFetchDraftSubmission = pathname !== RoutesRecord.SUBMISSIONS_NEW

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

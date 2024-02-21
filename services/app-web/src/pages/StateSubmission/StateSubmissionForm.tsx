import React from 'react'

import { Routes, Route } from 'react-router-dom'

import { Error404 } from '../Errors/Error404Page'

import {
    STATE_SUBMISSION_FORM_ROUTES,
    RouteT,
    RouteTWithUnknown,
    RoutesRecord,
} from '../../constants/routes'
import { getRelativePath } from '../../routeHelpers'
import { ContractDetails } from './ContractDetails'
import { RateDetails } from './RateDetails'
import { Contacts } from './Contacts'
import { Documents } from './Documents'
import { ReviewSubmit } from './ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { UnlockedHealthPlanFormDataType } from '../../common-code/healthPlanFormDataType'

// Can move this AppRoutes on future pass - leaving it here now to make diff clear
export const StateSubmissionForm = (): React.ReactElement => {
    return (
        <div>
            <Routes>
                <Route
                    path={getRelativePathFromNestedRoute('SUBMISSIONS_TYPE')}
                    element={<SubmissionType />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTRACT_DETAILS'
                    )}
                    element={<ContractDetails />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_RATE_DETAILS'
                    )}
                    element={<RateDetails />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTACTS'
                    )}
                    element={<Contacts />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_DOCUMENTS'
                    )}
                    element={<Documents />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_REVIEW_SUBMIT'
                    )}
                    element={<ReviewSubmit />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </div>
    )
}

// Utilities

export const activeFormPages = (
    draft: UnlockedHealthPlanFormDataType
): RouteTWithUnknown[] => {
    // If submission type is contract only, rate details is left out of the step indicator
    return STATE_SUBMISSION_FORM_ROUTES.filter(
        (formPage) =>
            !(
                draft?.submissionType === 'CONTRACT_ONLY' &&
                formPage === 'SUBMISSIONS_RATE_DETAILS'
            )
    )
}

const getRelativePathFromNestedRoute = (formRouteType: RouteT): string =>
    getRelativePath({
        basePath: RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL,
        targetPath: RoutesRecord[formRouteType],
    })

export type HealthPlanFormPageProps = {
    showValidations?: boolean
}

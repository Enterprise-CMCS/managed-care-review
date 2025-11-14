import React from 'react'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'
import { Route, Routes } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { SubmissionType } from './SubmissionType'
import { ContractDetails } from './ContractDetails'
import { RateDetails } from './RateDetails'
import { Contacts } from './Contacts'
import { ReviewSubmit } from './ReviewSubmit'
import { Error404 } from '../../Errors/Error404Page'

export const HealthPlanSubmissionForm = (): React.ReactElement => {
    return (
        <div
            data-testid="state-submission-form-page"
            className={formContainerStyles.formPage}
        >
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
                    element={<RateDetails type="MULTI" />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTACTS'
                    )}
                    element={<Contacts />}
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

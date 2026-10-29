import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { EBSubmissionDetails } from './EBSubmissionDetails'
import { Contacts } from '../SharedContactsPage'
import { Error404 } from '../../Errors/Error404Page'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'

export const EBSubmissionForm = (): React.ReactElement => {
    return (
        <div
            data-testid="eb-submission-form-page"
            className={formContainerStyles.formPage}
        >
            <Routes>
                <Route
                    path={getRelativePathFromNestedRoute('SUBMISSIONS_TYPE')}
                    element={<EBSubmissionDetails />}
                />
                {/* <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTRACT_DETAILS'
                    )}
                    element={<EBContractDetails />}
                /> */}
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTACTS'
                    )}
                    element={<Contacts />}
                />
                {/* <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_REVIEW_SUBMIT'
                    )}
                    element={<EBReviewSubmit />}
                /> */}
                <Route path="*" element={<Error404 />} />
            </Routes>
        </div>
    )
}

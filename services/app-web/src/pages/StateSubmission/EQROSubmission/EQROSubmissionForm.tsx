import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { EQROSubmissionDetails } from './EQROSubmissionDetails'
import { Contacts } from '../SharedContactsPage'
import { EQROContractDetails } from './EQROContractDetails/EQROContractDetails'
import { EQROReviewSubmit } from './EQROReviewSubmit'
import { Error404 } from '../../Errors/Error404Page'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'

export const EQROSubmissionForm = (): React.ReactElement => {
    return (
        <div
            data-testid="eqro-submission-form-page"
            className={formContainerStyles.formPage}
        >
            <Routes>
                <Route
                    path={getRelativePathFromNestedRoute('SUBMISSIONS_TYPE')}
                    element={<EQROSubmissionDetails />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTRACT_DETAILS'
                    )}
                    element={<EQROContractDetails />}
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
                    element={<EQROReviewSubmit />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </div>
    )
}

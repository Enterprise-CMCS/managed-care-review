import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { Error404 } from '../../Errors/Error404Page'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'
import { Contacts } from '../SharedContactsPage'
import { ILOSActuarialReport } from './ILOSActuarialReport'
import { ILOSAssociatedRateCertifications } from './ILOSAssociatedRateCertifications'
import { ILOSReviewSubmit } from './ILOSReviewSubmit'

// Page order lives in FORM_FLOWS (hooks/useFormFlow/FormFlow.ts). Every ILOS
// page has a route here, including conditional ones.
export const ILOSSubmissionForm = (): React.ReactElement => {
    return (
        <div
            data-testid="ilos-submission-form-page"
            className={formContainerStyles.formPage}
        >
            <Routes>
                <Route
                    path={getRelativePathFromNestedRoute('SUBMISSIONS_TYPE')}
                    element={<ILOSActuarialReport />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS'
                    )}
                    element={<ILOSAssociatedRateCertifications />}
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
                    element={<ILOSReviewSubmit />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </div>
    )
}

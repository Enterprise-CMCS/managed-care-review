import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { Error404 } from '../../Errors/Error404Page'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'
import { Contacts } from '../SharedContactsPage'
import { ILOSSubmissionDetails } from './ILOSSubmissionDetails'
import { ILOSAssociatedRateCertifications } from './ILOSAssociatedRateCertifications'

// TODO: Get rid of once each page's ticket creates these components.
const ILOSPagePlaceholder = ({ title }: { title: string }) => (
    <h2 data-testid="ilos-page-placeholder">{title}</h2>
)

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
                    element={<ILOSSubmissionDetails />}
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
                    element={<ILOSPagePlaceholder title="Review and submit" />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </div>
    )
}

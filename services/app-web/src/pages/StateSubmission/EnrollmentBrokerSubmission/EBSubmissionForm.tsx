import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { EBSubmissionDetails } from './EBSubmissionDetails'
import { Error404 } from '../../Errors/Error404Page'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'
import { EBContractDetails } from './EBContractDetails/EBContractDetails'
import { Contacts } from '../SharedContactsPage'
import { EBAssociatedContracts } from './EBAssociatedContracts/EBAssociatedContracts'

// TODO: Get rid of once each page's ticket creates these components.
const EBPagePlaceholder = ({ title }: { title: string }) => (
    <h2 data-testid="eb-page-placeholder">{title}</h2>
)

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
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_CONTRACT_DETAILS'
                    )}
                    element={<EBContractDetails />}
                />
                <Route
                    path={getRelativePathFromNestedRoute(
                        'SUBMISSIONS_ASSOCIATED_CONTRACTS'
                    )}
                    element={<EBAssociatedContracts />}
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
                    element={<EBPagePlaceholder title="Review and submit" />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </div>
    )
}

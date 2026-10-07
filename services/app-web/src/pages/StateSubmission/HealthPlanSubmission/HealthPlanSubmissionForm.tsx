import React from 'react'
import formContainerStyles from '../../../components/FormContainer/FormContainer.module.scss'
import { Route, Routes, useOutletContext } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { getRelativePathFromNestedRoute } from '../submissionUtils'
import { SideNavOutletContextType } from '../../SubmissionSideNav/SubmissionSideNav'
import { SubmissionType } from './SubmissionType'
import { ContractDetails } from './ContractDetails'
import { RateDetails } from './RateDetails'
import { Contacts } from '../SharedContactsPage'
import { Attestations } from './Attestations'
import { ReviewSubmit } from './ReviewSubmit'
import { Error404 } from '../../Errors/Error404Page'

export const HealthPlanSubmissionForm = (): React.ReactElement => {
    const { contract } = useOutletContext<SideNavOutletContextType>()
    const ldClient = useLDClient()
    const showProcurementAttestation: boolean = ldClient?.variation(
        featureFlags.PROCUREMENT_ATTESTATION.flag,
        featureFlags.PROCUREMENT_ATTESTATION.defaultValue
    )
    // Attestations page only exists for base contract submissions
    const showAttestationsPage =
        showProcurementAttestation &&
        contract.draftRevision?.formData.contractType === 'BASE'

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
                {showAttestationsPage && (
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_ATTESTATIONS'
                        )}
                        element={<Attestations />}
                    />
                )}
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

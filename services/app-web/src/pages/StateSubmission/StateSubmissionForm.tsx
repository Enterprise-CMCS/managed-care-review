import React from 'react'

import { useOutletContext, Navigate, generatePath } from 'react-router-dom'
import { Error404 } from '../Errors/Error404Page'
import {
    RoutesRecord,
    ContractSubmissionTypeRecord,
} from '@mc-review/constants'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import { useRouteParams } from '../../hooks'
import { EQROSubmissionForm } from './EQROSubmission/EQROSubmissionForm'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { HealthPlanSubmissionForm } from './HealthPlanSubmission/HealthPlanSubmissionForm'

// Can move this AppRoutes on future pass - leaving it here now to make diff clear
export const StateSubmissionForm = (): React.ReactElement => {
    const { contractSubmissionType } = useRouteParams()
    const ldClient = useLDClient()
    const showEqroSubmissions: boolean = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )

    const { contract } = useOutletContext<SideNavOutletContextType>()

    if (contract.status === 'RESUBMITTED' || contract.status === 'SUBMITTED') {
        return (
            <Navigate
                to={generatePath(RoutesRecord.SUBMISSIONS_SUMMARY, {
                    id: contract.id,
                    contractSubmissionType: contract.contractSubmissionType,
                })}
            />
        )
    }

    if (contractSubmissionType === ContractSubmissionTypeRecord['EQRO']) {
        return showEqroSubmissions ? <EQROSubmissionForm /> : <Error404 />
    }

    if (
        contractSubmissionType === ContractSubmissionTypeRecord['HEALTH_PLAN']
    ) {
        return <HealthPlanSubmissionForm />
    }

    return <Error404 />
}

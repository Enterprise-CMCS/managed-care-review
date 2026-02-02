import React, { useLayoutEffect } from 'react'
import { useOutletContext, Navigate, generatePath } from 'react-router-dom'
import {
    RoutesRecord,
    ContractSubmissionTypeRecord,
} from '@mc-review/constants'
import { useMemoizedStateHeader, useRouteParams } from '../../hooks'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { SideNavOutletContextType } from '../SubmissionSideNav/SubmissionSideNav'
import { EQROSubmissionForm } from './EQROSubmission'
import { HealthPlanSubmissionForm } from './HealthPlanSubmission/HealthPlanSubmissionForm'
import { Error404 } from '../Errors/Error404Page'
import { usePage } from '../../contexts/PageContext'

export const StateSubmissionForm = (): React.ReactElement => {
    const { contractSubmissionType } = useRouteParams()
    const { updateHeading } = usePage()
    const ldClient = useLDClient()
    const showEqroSubmissions: boolean = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )
    const { contract } = useOutletContext<SideNavOutletContextType>()
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: contract?.draftRevision?.contractName,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

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

    if (
        ContractSubmissionTypeRecord[contract.contractSubmissionType] !==
        contractSubmissionType
    ) {
        return <Error404 />
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

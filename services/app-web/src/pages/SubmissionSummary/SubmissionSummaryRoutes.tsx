import { useRouteParams } from '../../hooks'
import { EQROSubmissionSummary } from './EQROSubmissionSummary/EQROSubmissionSummary'
import { SubmissionSummary } from './SubmissionSummary'
import { Error404 } from '../Errors/Error404Page'
import React from 'react'

const SubmissionSummaryRoutes = ({
    showEqroSubmissions,
}: {
    showEqroSubmissions: boolean
}) => {
    const { contractSubmissionType } = useRouteParams()

    if (showEqroSubmissions && contractSubmissionType === 'eqro') {
        return <EQROSubmissionSummary />
    }
    if (contractSubmissionType === 'health-plan') {
        return <SubmissionSummary />
    }
    return <Error404 />
}

export { SubmissionSummaryRoutes }

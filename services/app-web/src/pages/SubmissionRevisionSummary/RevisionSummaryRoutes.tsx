import React from 'react'
import { useRouteParams } from '../../hooks'
import { Error404 } from '../Errors/Error404Page'
import { EQROSubmissionRevisionSummary } from './EQROSubmissionRevisionSummary'
import { SubmissionRevisionSummary } from './SubmissionRevisionSummary'

const RevisionSummaryRoutes = ({
    showEqroSubmissions,
}: {
    showEqroSubmissions: boolean
}) => {
    const { contractSubmissionType } = useRouteParams()

    if (showEqroSubmissions && contractSubmissionType === 'eqro') {
        return <EQROSubmissionRevisionSummary />
    }
    if (contractSubmissionType === 'health-plan') {
        return <SubmissionRevisionSummary />
    }
    return <Error404 />
}

export { RevisionSummaryRoutes }

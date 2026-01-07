import { useMemo } from 'react'
import { StateHeading } from '../components/Header'
import type { ContractSubmissionDisplayType } from '../components/Header'
import { ContractSubmissionType } from '../gen/gqlClient'
import { useCurrentRoute } from './useCurrentRoute'

interface UseStateHeaderDisplayProps {
    subHeaderText?: string
    stateCode?: string
    stateName?: string
    contractType?: ContractSubmissionType | 'eqro' | 'health-plan'
}

/**
 * A hook to memoize page header react components for updateHeading() function.
 *
 * @param subHeaderText - Subheader text. Submission ID for contracts and Rate name for rates.
 * @param stateCode - State abbreviation of the submission.
 * @param stateName - Full state name of the submission.
 * @param contractType - Contract submission type, supplied only for contracts.
 */
export const useMemoizedStateHeader = ({
    subHeaderText,
    stateCode,
    stateName,
    contractType,
}: UseStateHeaderDisplayProps) => {
    const { currentRoute: route } = useCurrentRoute()

    let contractSubmissionType: ContractSubmissionDisplayType = undefined

    if (contractType === 'EQRO' || contractSubmissionType === 'eqro') {
        contractSubmissionType = 'EQRO'
    }

    if (contractType === 'HEALTH_PLAN' || contractType === 'health-plan') {
        contractSubmissionType = 'Health plan'
    }

    return useMemo(
        () => (
            <StateHeading
                subHeaderText={subHeaderText}
                route={route}
                stateCode={stateCode}
                stateName={stateName}
                contractType={contractSubmissionType}
            />
        ),
        [subHeaderText, route, stateCode, stateName, contractSubmissionType]
    )
}

import { useMemo } from 'react'
import { StateHeading, NewSubmissionStateHeading } from '../components/Header'
import type { ContractSubmissionDisplayType } from '../components/Header'
import { ContractSubmissionType, StateUser } from '../gen/gqlClient'
import { useCurrentRoute } from './useCurrentRoute'
import { useAuth } from '../contexts/AuthContext'
import { ContractSubmissionTypeParams } from '@mc-review/constants'

interface UseStateHeaderDisplayProps {
    subHeaderText?: string
    stateCode?: string
    stateName?: string
    contractType?: ContractSubmissionType | ContractSubmissionTypeParams
}

const parseContractType = (
    contractType: UseStateHeaderDisplayProps['contractType']
): ContractSubmissionDisplayType => {
    if (contractType === 'EQRO' || contractType === 'eqro') return 'EQRO'
    if (contractType === 'HEALTH_PLAN' || contractType === 'health-plan')
        return 'Health plan'

    return undefined
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
    const contractSubmissionType = parseContractType(contractType)

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

/**
 * A hook to memoize new submission page header react component for updateHeading() function.
 *
 * @param contractType - Contract submission type, supplied only for contracts.
 */
export const useMemoizedNewSubmissionHeader = ({
    contractType,
}: UseStateHeaderDisplayProps) => {
    const { loggedInUser } = useAuth()
    const contractSubmissionType = parseContractType(contractType)

    return useMemo(
        () => (
            <NewSubmissionStateHeading
                stateUser={loggedInUser as StateUser}
                contractType={contractSubmissionType}
            />
        ),
        [loggedInUser, contractSubmissionType]
    )
}

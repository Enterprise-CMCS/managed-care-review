import React from 'react'
import { PoliteErrorMessage } from '../../../components'
import { isDateRangeEmpty } from '../../../formHelpers'

export const ContractDatesErrorMessage = ({
    contractDateStart,
    contractDateEnd,
    validationErrorMessage,
    formFieldLabel,
}: {
    contractDateStart: string
    contractDateEnd: string
    validationErrorMessage: string
    formFieldLabel: string
}): React.ReactElement => (
    <PoliteErrorMessage formFieldLabel={formFieldLabel}>
        {isDateRangeEmpty(contractDateStart, contractDateEnd)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </PoliteErrorMessage>
)

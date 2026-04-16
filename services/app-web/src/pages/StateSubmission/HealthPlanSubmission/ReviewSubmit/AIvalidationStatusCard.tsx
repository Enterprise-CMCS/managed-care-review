import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import type { AIValidationDisplayState } from './aiValidationStatus'

interface Props {
    state: AIValidationDisplayState
}

export const AIValidationStatusCard = ({
    state,
}: Props): React.ReactElement => {
    return (
        <Alert
            type={state.alertType}
            headingLevel="h2"
            heading={state.title}
            slim
        >
            <p>{state.message}</p>
        </Alert>
    )
}

import React, { useEffect, useRef, useState } from 'react'
import { Alert } from '@trussworks/react-uswds'
import { ButtonWithLogging } from '../../../../components'
import { AIValidationFindingsCard } from './AIValidationFindingsCard'
import type { AIValidationDisplayItem } from './aiValidationFindings'
import type { AIValidationDisplayState } from './aiValidationStatus'
import styles from './ReviewSubmit.module.scss'

export type AIValidationBannerMode = 'status' | 'findings'

interface Props {
    mode: AIValidationBannerMode
    state: AIValidationDisplayState
    findings?: AIValidationDisplayItem[]
}

export const AIValidationStatusCard = ({
    mode,
    state,
    findings = [],
}: Props): React.ReactElement => {
    const showFindings = mode === 'findings' && findings.length > 0
    const [findingsExpanded, setFindingsExpanded] = useState(showFindings)
    const hadFindingsRef = useRef(showFindings)

    useEffect(() => {
        if (showFindings && !hadFindingsRef.current) {
            setFindingsExpanded(true)
        }

        hadFindingsRef.current = showFindings
    }, [showFindings])

    return (
        <Alert
            type={showFindings ? 'success' : state.alertType}
            headingLevel="h2"
            heading={showFindings ? 'Validation findings' : state.title}
            slim={!showFindings}
        >
            <p>
                {showFindings
                    ? 'We reviewed the uploaded documents and found the following results.'
                    : state.message}
            </p>
            {showFindings && (
                <>
                    {findingsExpanded && (
                        <div
                            id="validation-findings-table"
                            className={styles.validationFindingsContent}
                        >
                            <AIValidationFindingsCard findings={findings} />
                        </div>
                    )}
                    <ButtonWithLogging
                        type="button"
                        unstyled
                        parent_component_type="toggle"
                        className={`${styles.validationFindingsToggle} usa-link`}
                        onClick={() =>
                            setFindingsExpanded((expanded) => !expanded)
                        }
                        aria-expanded={findingsExpanded}
                        aria-controls="validation-findings-table"
                    >
                        {findingsExpanded ? 'Show less' : 'Show more'}
                    </ButtonWithLogging>
                </>
            )}
        </Alert>
    )
}

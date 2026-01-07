import React from 'react'
import { Grid } from '@trussworks/react-uswds'
import styles from '../Header.module.scss'
import { StateIcon, StateIconProps } from '../StateIcon/StateIcon'
import { PageHeading } from '../../PageHeading'
import {
    RATE_PAGE_HEADING_ROUTES,
    RouteTWithUnknown,
    SUBMISSION_PAGE_HEADING_ROUTES,
} from '@mc-review/constants'

export type ContractSubmissionDisplayType = 'EQRO' | 'Health plan' | undefined

const getSubHeaderTitle = (route?: RouteTWithUnknown): string | undefined => {
    if (route) {
        // if (pathname?.includes('/rates/')) return 'Rate name'
        if (RATE_PAGE_HEADING_ROUTES.includes(route)) return 'Rate name'
        // if (pathname?.includes('submission')) return 'Submission ID'
        if (SUBMISSION_PAGE_HEADING_ROUTES.includes(route))
            return 'Submission ID'
    }

    return undefined
}

export const StateHeading = ({
    subHeaderText,
    stateCode,
    stateName,
    contractType,
    route,
}: {
    subHeaderText?: string
    route?: RouteTWithUnknown
    stateCode?: string
    stateName?: string
    contractType?: ContractSubmissionDisplayType
}) => {
    return (
        <Grid row className={`flex-align-center ${styles.stateRow}`}>
            {stateCode && stateName && (
                <>
                    <div>
                        <StateIcon code={stateCode as StateIconProps['code']} />
                    </div>
                    <PageHeading data-testid="stateDisplay">
                        <span className="srOnly">{stateName}&nbsp;</span>
                        <span className={styles.stateHeadingText}>
                            {stateName}&nbsp;
                        </span>
                        {subHeaderText && (
                            <span
                                className={styles.submissionIdLine}
                                data-testid="submission-id"
                            >
                                <span className={styles.submissionIdLineLabel}>
                                    {getSubHeaderTitle(route)}
                                </span>
                                <span
                                    className={styles.submissionIdLineDivider}
                                    aria-hidden="true"
                                >
                                    |
                                </span>
                                <span className={styles.submissionIdLineValue}>
                                    {subHeaderText}
                                </span>
                            </span>
                        )}
                    </PageHeading>
                    {contractType && (
                        <div
                            className={styles.contractTypeContainer}
                            data-testid="contractType"
                        >
                            <div
                                className={styles.contractTypeDivider}
                                aria-hidden="true"
                            />
                            <div className={styles.contractTypeText}>
                                <span className={styles.contractTypeLabel}>
                                    Contract type
                                </span>
                                <span className={styles.contractTypeValue}>
                                    {contractType}
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Grid>
    )
}

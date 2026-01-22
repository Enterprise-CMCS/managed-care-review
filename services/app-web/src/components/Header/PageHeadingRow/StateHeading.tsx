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
import { StateUser } from '../../../gen/gqlClient'

export type ContractSubmissionDisplayType = 'EQRO' | 'Health plan' | undefined

const getSubHeaderTitle = (route?: RouteTWithUnknown): string | undefined => {
    if (route) {
        if (RATE_PAGE_HEADING_ROUTES.includes(route)) return 'Rate name'
        if (SUBMISSION_PAGE_HEADING_ROUTES.includes(route))
            return 'Submission ID'
    }
    return undefined
}

const ContractTypeHeaderSection = ({
    contractType,
}: {
    contractType: ContractSubmissionDisplayType
}) => {
    return (
        <div
            className={styles.contractTypeContainer}
            data-testid="contractType"
        >
            <div className={styles.contractTypeDivider} aria-hidden="true" />
            <div className={styles.contractTypeText}>
                <span className={styles.contractTypeLabel}>Contract type</span>
                <span className={styles.contractTypeValue}>{contractType}</span>
            </div>
        </div>
    )
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
                        <ContractTypeHeaderSection
                            contractType={contractType}
                        />
                    )}
                </>
            )}
        </Grid>
    )
}

export const NewSubmissionStateHeading = ({
    stateUser,
    contractType,
}: {
    stateUser?: StateUser
    contractType?: ContractSubmissionDisplayType
}) => {
    return (
        <Grid row className={`flex-align-center ${styles.stateRow}`}>
            {stateUser && (
                <>
                    <div>
                        <StateIcon
                            code={
                                stateUser.state.code as StateIconProps['code']
                            }
                        />
                        <span>{stateUser.state.name}&nbsp;</span>
                    </div>
                    {contractType && (
                        <ContractTypeHeaderSection
                            contractType={contractType}
                        />
                    )}
                </>
            )}
        </Grid>
    )
}

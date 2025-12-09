import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'

import styles from '../Header.module.scss'

import { PageHeading } from '../../../components/PageHeading'
import { StateIcon, StateIconProps } from '../StateIcon/StateIcon'
import {
    User,
    CmsUser,
    AdminUser,
    HelpdeskUser,
    BusinessOwnerUser,
    CmsApproverUser,
    StateUser,
} from '../../../gen/gqlClient'
import {
    hasAdminUserPermissions,
    hasCMSUserPermissions,
} from '@mc-review/helpers'

type ContractSubmissionType = 'EQRO' | 'Health plan'
const hideSubIDRoutes = {
    cms: ['dashboard', 'mc-review-settings'],
    state: ['dashboard', 'new'],
}

const pathIncludesAny = (
    pathname: string | undefined,
    fragments: readonly string[]
): boolean =>
    !!pathname && fragments.some((fragment) => pathname.includes(fragment))

const getContractTypeFromPath = (pathname?: string): ContractSubmissionType =>
    pathname?.includes('eqro') ? 'EQRO' : 'Health plan'

const SharedSubHeadingRow = ({
    submissionID,
}: {
    submissionID: string | React.ReactElement
}) => {
    return (
        <span className={styles.submissionIdLine} data-testid="submission-id">
            <span className={styles.submissionIdLineLabel}>Submission ID</span>
            <span className={styles.submissionIdLineDivider} aria-hidden="true">
                |
            </span>
            <span className={styles.submissionIdLineValue}>{submissionID}</span>
        </span>
    )
}
const ContractType = ({
    contractType,
}: {
    contractType: ContractSubmissionType
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

const StateDisplay = ({
    heading,
    stateCode,
    stateName,
    contractType,
}: {
    heading?: string | React.ReactElement
    pathname?: string
    route?: string
    stateCode?: string
    stateName?: string
    contractType: ContractSubmissionType
}) => {
    return (
        <Grid row className={`flex-align-center ${styles.stateRow}`}>
            <div>
                <StateIcon code={stateCode as StateIconProps['code']} />
            </div>
            <PageHeading data-testid="stateDisplay">
                <span className="srOnly">{stateName}&nbsp;</span>

                <span className={styles.stateHeadingText}>
                    {stateName}&nbsp;
                </span>

                {heading && <SharedSubHeadingRow submissionID={heading} />}
            </PageHeading>
            <ContractType contractType={contractType} />
        </Grid>
    )
}

const CMSUserRow = ({
    heading,
    pathname,
    stateCode,
    stateName,
    isLoading,
}: {
    user:
        | CmsUser
        | AdminUser
        | HelpdeskUser
        | BusinessOwnerUser
        | CmsApproverUser
    heading?: string | React.ReactElement
    pathname?: string
    stateCode?: string
    stateName?: string
    isLoading?: boolean
}) => {
    const hideSubID = pathIncludesAny(pathname, hideSubIDRoutes.cms)
    const contractType = getContractTypeFromPath(pathname)

    return (
        <div className={styles.dashboardHeading}>
            {!isLoading && (
                <GridContainer>
                    {hideSubID ? (
                        <Grid row className="flex-align-center">
                            <PageHeading>
                                <span>CMS</span>
                                {heading && (
                                    <span
                                        className="font-heading-lg text-light"
                                        data-testid="submission-name"
                                    >
                                        {heading}
                                    </span>
                                )}
                            </PageHeading>
                        </Grid>
                    ) : (
                        <StateDisplay
                            heading={heading}
                            pathname={pathname}
                            stateCode={stateCode}
                            stateName={stateName}
                            contractType={contractType}
                        />
                    )}
                </GridContainer>
            )}
        </div>
    )
}

const StateUserRow = ({
    user,
    heading,
    pathname,
}: {
    user: StateUser
    heading?: string | React.ReactElement
    pathname?: string
}) => {
    const hideSubID = pathIncludesAny(pathname, hideSubIDRoutes.state)
    const contractType = getContractTypeFromPath(pathname)
    return (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                {hideSubID ? (
                    <Grid row className="flex-align-center">
                        <div>
                            <StateIcon
                                code={user.state.code as StateIconProps['code']}
                            />
                            <span>{user.state.name}&nbsp;</span>
                        </div>
                        <PageHeading>
                            <span className="srOnly">
                                {user.state.name}&nbsp;
                            </span>
                            {heading && (
                                <span
                                    className="font-heading-lg text-light"
                                    data-testid="submission-name"
                                >
                                    {heading}
                                </span>
                            )}
                        </PageHeading>
                    </Grid>
                ) : (
                    <Grid
                        row
                        className={`flex-align-center ${styles.stateRow}`}
                    >
                        <StateDisplay
                            heading={heading}
                            pathname={pathname}
                            stateCode={user.state.code}
                            stateName={user.state.name}
                            contractType={contractType}
                        />
                    </Grid>
                )}
            </GridContainer>
        </div>
    )
}

const LandingRow = ({ isLoading }: { isLoading: boolean }) => {
    return (
        <div className={styles.landingPageHeading}>
            <GridContainer>
                <h1>
                    {!isLoading && (
                        <>
                            <span className="text-bold">
                                Managed Care Review&nbsp;
                            </span>
                            <span className="font-heading-lg">
                                Medicaid and CHIP Managed Care Reporting and
                                Review System
                            </span>
                        </>
                    )}
                </h1>
            </GridContainer>
        </div>
    )
}

type PageHeadingProps = {
    isLoading?: boolean
    loggedInUser?: User
    heading?: string | React.ReactElement
    route?: string
    pathname?: string
    stateCode?: string
    stateName?: string
}

export const PageHeadingRow = ({
    isLoading = false,
    heading,
    stateCode,
    stateName,
    route,
    pathname,
    loggedInUser,
}: PageHeadingProps): React.ReactElement | null => {
    if (!loggedInUser) {
        if (route === 'HELP') {
            return null
        } else {
            return <LandingRow isLoading={isLoading} />
        }
    }

    if (
        hasCMSUserPermissions(loggedInUser) ||
        hasAdminUserPermissions(loggedInUser)
    ) {
        return (
            <CMSUserRow
                user={loggedInUser}
                heading={heading}
                pathname={pathname}
                stateName={stateName}
                isLoading={isLoading && !stateCode}
                stateCode={stateCode}
            />
        )
    } else if (loggedInUser.__typename === 'StateUser') {
        return (
            <StateUserRow
                heading={heading}
                pathname={pathname}
                user={loggedInUser}
            />
        )
    } else {
        return <h1>{`Programming Error: Unkown User Type: ${loggedInUser}`}</h1>
    }
}

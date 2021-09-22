import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from './SubmissionSummaryCard.module.scss'
import { DraftSubmission, StateSubmission } from '../../gen/gqlClient'

export type SubmissionSummaryCardProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

type cardHeaderProps = {
    header: string
    navigateTo?: string
}

export const CardHeader = ({
    header,
    navigateTo,
}: cardHeaderProps): React.ReactElement => {
    return (
        <div className={styles.reviewSectionHeader}>
            <h2>{header}</h2>
            {navigateTo && (
                <div>
                    <Link
                        variant="unstyled"
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        to={navigateTo}
                    >
                        Edit <span className="srOnly">{header}</span>
                    </Link>
                </div>
            )}
        </div>
    )
}

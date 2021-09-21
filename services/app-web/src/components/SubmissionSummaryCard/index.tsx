import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from './SubmissionSummaryCard.module.scss'
import { DraftSubmission, StateSubmission } from '../../gen/gqlClient'

export type SubmissionSummaryCardProps = {
    submission: DraftSubmission | StateSubmission
    editable: boolean
    to: string
}

type cardHeaderProps = {
    header: string
    editable: boolean
    to: string
}
export const CardHeader = ({
    header,
    editable,
    to,
}: cardHeaderProps): React.ReactElement => {
    return (
        <div className={styles.reviewSectionHeader}>
            <h2>{header}</h2>
            {editable && (
                <div>
                    <Link
                        variant="unstyled"
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        to={to}
                    >
                        Edit <span className="srOnly">{header}</span>
                    </Link>
                </div>
            )}
        </div>
    )
}

export { SubmissionTypeSummaryCard } from './SubmissionTypeSummaryCard/SubmissionTypeSummaryCard'

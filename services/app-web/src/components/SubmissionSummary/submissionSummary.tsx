import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from '../../pages/StateSubmissionForm/ReviewSubmit/ReviewSubmit.module.scss'
import { DraftSubmission, StateSubmission } from '../../gen/gqlClient'

export type SubmissionSectionSummaryProps = {
    submission: DraftSubmission | StateSubmission
    editable: boolean
    to: string
}

export const SectionHeader = ({
    header,
    editable,
    to,
}: {
    header: string
    editable: boolean
    to: string
}): React.ReactElement => {
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

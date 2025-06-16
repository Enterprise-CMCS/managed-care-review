import { ConsolidatedContractStatus, User } from '../../../gen/gqlClient'
import styles from './QATable.module.scss'
import { NavLinkWithLogging } from '../../../components'
import classNames from 'classnames'
import { QuestionDisplayTable } from './QuestionDisplayTable'
import {
    extractDocumentsFromQuestion,
    QuestionType,
} from '../QuestionResponseHelpers/questionResponseHelpers'

export type RoundData = {
    roundTitle: string
    questionData: QuestionType
}

export type QuestionRounds = RoundData[][]

export type QuestionResponseRoundPropType = {
    question: QuestionType
    roundTitle: string
    currentUser: User
    contractStatus?: ConsolidatedContractStatus
    qaSectionHeaderId?: string
}

/**
 * Renders a question and response section for a specific round, displaying the question details
 * in a table format with an optional upload button for state users to submit responses.
 *
 * @param {Object} props -
 * @param {QuestionType} props.question - Type of question, contract or rate.
 * @param {string} props.roundTitle - Title of header for the QA table
 * @param {User} props.currentUser - Current user viewing the page
 * @param {ConsolidatedContractStatus} [props.contractStatus] - Consolidated contract status.
 * @param {string} [props.qaSectionHeaderId] - ID to the Q&A section header, used for describing the upload response button.
 */
export const QuestionResponseRound = ({
    question,
    roundTitle,
    currentUser,
    contractStatus,
    qaSectionHeaderId,
}: QuestionResponseRoundPropType) => {
    const isStateUser = currentUser?.__typename === 'StateUser'
    const isApprovedContract = contractStatus === 'APPROVED'
    const classes = classNames('usa-button', {
        'usa-button--outline': question.responses.length > 0,
    })

    const documents = extractDocumentsFromQuestion(question)

    return (
        <section
            data-testid="questionResponseRound"
            id={`${question.id}-section`}
        >
            <div className={styles.tableHeader}>
                <h4 id={`${question.id}-header`}>{roundTitle}</h4>
                {isStateUser && !isApprovedContract && (
                    <NavLinkWithLogging
                        className={classes}
                        variant="unstyled"
                        aria-describedby={`${qaSectionHeaderId} ${question.id}-table ${question.id}-header`}
                        to={`./${question.division.toLowerCase()}/${question.id}/upload-response`}
                    >
                        Upload response
                    </NavLinkWithLogging>
                )}
            </div>
            <QuestionDisplayTable
                id={`${question.id}-table`}
                documents={documents}
                user={currentUser}
                onlyDisplayInitial={false}
            />
        </section>
    )
}

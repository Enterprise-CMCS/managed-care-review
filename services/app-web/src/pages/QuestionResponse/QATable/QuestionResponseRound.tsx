import type { ConsolidatedContractStatus, User } from '../../../gen/gqlClient'
import styles from './QATable.module.scss'
import { NavLinkWithLogging } from '../../../components'
import classNames from 'classnames'
import { QuestionDisplayTable } from './QuestionDisplayTable'
import {
    extractDocumentsFromQuestion,
    QuestionType,
} from '../QuestionResponseHelpers/questionResponseHelpers'
import { isAdminQuestionResponseAllowedStatus } from '@mc-review/constants'

export type RoundData = {
    roundTitle: string
    questionData: QuestionType
}

export type QuestionRounds = RoundData[][]

export type QuestionResponseRoundPropType = {
    question: QuestionType
    roundTitle: string
    currentUser: User
    questionType: 'contract' | 'rate'
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
    questionType,
    contractStatus,
    qaSectionHeaderId,
}: QuestionResponseRoundPropType) => {
    const isStateUser = currentUser?.__typename === 'StateUser'
    const isAdminUser = currentUser?.__typename === 'AdminUser'
    const isApprovedContract = contractStatus === 'APPROVED'
    const buttonClass = classNames('usa-button', {
        'usa-button--outline': question.responses.length > 0,
    })

    const deleteButtonClass = classNames('usa-button', 'usa-button--secondary')

    const showUploadResponseBtn = isStateUser && !isApprovedContract
    const showDeleteQuestionBtn = isAdminUser && questionType === 'contract'
    // Responses can only be soft-deleted on contract Q&A. The admin-only
    // permission check lives in QuestionDisplayTable.
    const allowDeleteResponse = questionType === 'contract'
    const showAdminUploadResponseBtn =
        isAdminUser &&
        questionType === 'contract' &&
        isAdminQuestionResponseAllowedStatus(contractStatus)

    const documents = extractDocumentsFromQuestion(question)

    return (
        <section
            data-testid="questionResponseRound"
            id={`${question.id}-section`}
        >
            <div className={styles.tableHeader}>
                <h4 id={`${question.id}-header`}>{roundTitle}</h4>
                {showUploadResponseBtn && (
                    <NavLinkWithLogging
                        className={buttonClass}
                        variant="unstyled"
                        aria-describedby={`${qaSectionHeaderId} ${question.id}-header`}
                        to={`./${question.division.toLowerCase()}/${question.id}/upload-response`}
                    >
                        Upload response
                    </NavLinkWithLogging>
                )}
                {showAdminUploadResponseBtn && (
                    <NavLinkWithLogging
                        className={buttonClass}
                        variant="unstyled"
                        aria-describedby={`${qaSectionHeaderId} ${question.id}-header`}
                        to={`./${question.id}/admin-upload-response`}
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
                allowDeleteResponse={allowDeleteResponse}
            />
            {showDeleteQuestionBtn && (
                <div className={styles.tableFooter}>
                    <NavLinkWithLogging
                        className={deleteButtonClass}
                        variant="unstyled"
                        aria-describedby={`${qaSectionHeaderId} ${question.id}-header`}
                        to={`./${question.division.toLowerCase()}/${question.id}/delete-question`}
                    >
                        Delete question
                    </NavLinkWithLogging>
                </div>
            )}
        </section>
    )
}

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

export const QuestionResponseRound = ({
    question,
    roundTitle,
    currentUser,
    contractStatus,
}: {
    question: QuestionType
    roundTitle: string
    currentUser: User
    contractStatus?: ConsolidatedContractStatus
}) => {
    const isStateUser = currentUser?.__typename === 'StateUser'
    const isApprovedContract = contractStatus === 'APPROVED'
    const classes = classNames('usa-button', {
        'usa-button--outline': question.responses.length > 0,
    })

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
                        aria-describedby={`${question.id}-table ${question.id}-header`}
                        to={`./${question.division.toLowerCase()}/${question.id}/upload-response`}
                    >
                        Upload response
                    </NavLinkWithLogging>
                )}
            </div>
            <QuestionDisplayTable
                id={`${question.id}-table`}
                documents={extractDocumentsFromQuestion(question)}
                user={currentUser}
                onlyDisplayInitial={false}
            />
        </section>
    )
}

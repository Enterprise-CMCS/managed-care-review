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
        <div data-testid="questionResponseRound">
            <div className={styles.tableHeader}>
                <h4>{roundTitle}</h4>
                {isStateUser && !isApprovedContract && (
                    <NavLinkWithLogging
                        className={classes}
                        variant="unstyled"
                        to={`./${question.division.toLowerCase()}/${question.id}/upload-response`}
                    >
                        Upload response
                    </NavLinkWithLogging>
                )}
            </div>
            <QuestionDisplayTable
                documents={extractDocumentsFromQuestion(question)}
                user={currentUser}
                onlyDisplayInitial={false}
            />
        </div>
    )
}

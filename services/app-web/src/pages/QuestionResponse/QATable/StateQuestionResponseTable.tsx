import {
    ConsolidatedContractStatus,
    ContractQuestionList,
    RateQuestionList,
} from '../../../gen/gqlClient'
import { SectionHeader } from '../../../components'
import styles from '../QuestionResponse.module.scss'
import { useAuth } from '../../../contexts/AuthContext'
import { divisionFullNames } from '../QuestionResponseHelpers'
import type { IndexQuestionType } from '../QuestionResponseHelpers'
import { QuestionResponseRound, QuestionRounds } from './QuestionResponseRound'
import { sortRoundsByDate } from './CMSQuestionResponseTable'

type StateQuestionResponseTableProps = {
    indexQuestions: IndexQuestionType
    questionType: 'contract' | 'rate'
    header?: string
    contractStatus?: ConsolidatedContractStatus
}

export const StateQuestionResponseTable = ({
    indexQuestions,
    questionType,
    header,
    contractStatus,
}: StateQuestionResponseTableProps) => {
    const { loggedInUser } = useAuth()
    const answeredQuestions: QuestionRounds = []
    const unansweredQuestions: QuestionRounds = []

    // Bucket questions
    Object.entries(indexQuestions).forEach(([key, value]) => {
        // skip iterating on typename.
        if (key === '__typename') return
        const questionsList: RateQuestionList | ContractQuestionList = value

        // Reverse each division question so that we start at round 1 for each question, otherwise we get
        // mismatching rounds.
        Array.from([...questionsList.edges])
            .sort(
                (a, b) =>
                    new Date(a.node.createdAt).getTime() -
                    new Date(b.node.createdAt).getTime()
            )
            .forEach(({ node }, index) => {
                // set reference to add question to
                const rounds =
                    node.responses.length > 0
                        ? answeredQuestions
                        : unansweredQuestions
                if (!rounds[index]) {
                    rounds[index] = []
                }
                rounds[index].push({
                    roundTitle: `Asked by: ${divisionFullNames[node.division]} - Round ${node.round}`,
                    questionData: node,
                })
            })
    })

    // Sort each round by latest questions first
    const sortedAnsweredQuestions = sortRoundsByDate(answeredQuestions)
    const sortedUnansweredQuestions = sortRoundsByDate(unansweredQuestions)

    return (
        <>
            {header && (
                <div className={styles.tableHeader}>
                    <SectionHeader
                        header={header}
                        hideBorderBottom
                        hideBorderTop
                    />
                </div>
            )}
            <section
                className={styles.questionSection}
                data-testid={'outstandingQuestions'}
            >
                <SectionHeader
                    header="Outstanding questions"
                    headerId="outsandingContractQuestions"
                    headingLevel="h3"
                    hideBorderTop
                />
                {sortedUnansweredQuestions.length ? (
                    sortedUnansweredQuestions.map((questionRound) =>
                        questionRound.map(({ roundTitle, questionData }) => (
                            <QuestionResponseRound
                                key={questionData.id}
                                question={questionData}
                                roundTitle={roundTitle}
                                currentUser={loggedInUser!}
                                questionType={questionType}
                                contractStatus={contractStatus}
                                qaSectionHeaderId="outsandingContractQuestions"
                            />
                        ))
                    )
                ) : (
                    <p>No questions have been submitted yet.</p>
                )}
            </section>
            <section
                className={styles.questionSection}
                data-testid={'answeredQuestions'}
            >
                <SectionHeader
                    header="Answered questions"
                    headerId="answeredContractQuestions"
                    hideBorderTop
                    headingLevel="h3"
                />
                {sortedAnsweredQuestions.length ? (
                    sortedAnsweredQuestions.map((questionRound) =>
                        questionRound.map(({ roundTitle, questionData }) => (
                            <QuestionResponseRound
                                key={questionData.id}
                                question={questionData}
                                roundTitle={roundTitle}
                                currentUser={loggedInUser!}
                                questionType={questionType}
                                contractStatus={contractStatus}
                                qaSectionHeaderId="answeredContractQuestions"
                            />
                        ))
                    )
                ) : (
                    <p>No questions have been submitted yet.</p>
                )}
            </section>
        </>
    )
}

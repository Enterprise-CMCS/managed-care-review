import { ContractQuestionList, RateQuestionList } from '../../../gen/gqlClient'
import { SectionHeader } from '../../../components'
import styles from '../QuestionResponse.module.scss'
import { useAuth } from '../../../contexts/AuthContext'
import { divisionFullNames } from '../QuestionResponseHelpers'
import type { IndexQuestionType } from '../QuestionResponseHelpers'
import { QuestionResponseRound, QuestionRounds } from './QuestionResponseRound'

type StateQuestionResponseTableProps = {
    indexQuestions: IndexQuestionType
    rateCertName?: string
}

export const StateQuestionResponseTable = ({
    indexQuestions,
    rateCertName,
}: StateQuestionResponseTableProps) => {
    const { loggedInUser } = useAuth()
    const answeredQuestions: QuestionRounds = []
    const unansweredQuestions: QuestionRounds = []

    // Bucket questions
    Object.entries(indexQuestions).forEach(([key, value]) => {
        if (key === '__typename') {
            return
        }
        const questionsList: RateQuestionList | ContractQuestionList = value

        // reverse questions to the earliest question first as rounds would be mismatched when looping through two arrays of different lengths
        Array.from([...questionsList.edges])
            .reverse()
            .forEach(({ node }, index) => {
                if (node.responses.length > 0) {
                    if (!answeredQuestions[index]) {
                        answeredQuestions[index] = []
                    }
                    answeredQuestions[index].push({
                        roundTitle: `Asked by: ${divisionFullNames[node.division]}`,
                        questionData: node,
                    })
                } else {
                    if (!unansweredQuestions[index]) {
                        unansweredQuestions[index] = []
                    }
                    unansweredQuestions[index].push({
                        roundTitle: `Asked by: ${divisionFullNames[node.division]}`,
                        questionData: node,
                    })
                }
            })
    })

    return (
        <>
            <div className={styles.tableHeader}>
                <SectionHeader
                    header={`Rate questions: ${rateCertName}`}
                    hideBorder
                />
            </div>
            <section
                className={styles.questionSection}
                data-testid={'outstandingQuestions'}
            >
                <SectionHeader header="Outstanding questions" />
                {unansweredQuestions.length ? (
                    unansweredQuestions
                        .reverse()
                        .map((questionRound) =>
                            questionRound.map(
                                ({ roundTitle, questionData }) => (
                                    <QuestionResponseRound
                                        key={questionData.id}
                                        question={questionData}
                                        roundTitle={roundTitle}
                                        currentUser={loggedInUser}
                                    />
                                )
                            )
                        )
                ) : (
                    <p>No questions have been submitted yet.</p>
                )}
            </section>
            <section
                className={styles.questionSection}
                data-testid={'answeredQuestions'}
            >
                <SectionHeader header="Answered questions" />
                {answeredQuestions.length ? (
                    answeredQuestions
                        .reverse()
                        .map((questionRound) =>
                            questionRound.map(
                                ({ roundTitle, questionData }) => (
                                    <QuestionResponseRound
                                        key={questionData.id}
                                        question={questionData}
                                        roundTitle={roundTitle}
                                        currentUser={loggedInUser}
                                    />
                                )
                            )
                        )
                ) : (
                    <p>No questions have been submitted yet.</p>
                )}
            </section>
        </>
    )
}

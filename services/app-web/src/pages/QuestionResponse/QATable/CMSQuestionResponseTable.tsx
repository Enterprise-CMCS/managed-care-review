import {
    ContractQuestionList,
    Division,
    RateQuestionList,
} from '../../../gen/gqlClient'
import type { QuestionRounds } from './QuestionResponseRound'
import { QuestionResponseRound } from './QuestionResponseRound'
import { NavLinkWithLogging, SectionHeader } from '../../../components'
import styles from '../QuestionResponse.module.scss'
import { useAuth } from '../../../contexts/AuthContext'
import { IndexQuestionType } from '../QuestionResponseHelpers'

type CMSQuestionResponseTableProps = {
    indexQuestions: IndexQuestionType
    userDivision?: Division
}

export const CMSQuestionResponseTable = ({
    indexQuestions,
    userDivision,
}: CMSQuestionResponseTableProps) => {
    const { loggedInUser } = useAuth()

    const currentDivisionRounds = (): QuestionRounds => {
        if (!userDivision) {
            return []
        }

        const divisionQuestions = indexQuestions[`${userDivision}Questions`]
        const rounds: QuestionRounds = []

        const sortedQuestions = [...divisionQuestions.edges]
        sortedQuestions.sort(
            (a, b) =>
                new Date(b.node.createdAt).getTime() -
                new Date(a.node.createdAt).getTime()
        )

        sortedQuestions.forEach(({ node }, index) => {
            if (!rounds[index]) {
                rounds[index] = []
            }

            rounds[index].push({
                roundTitle: `Round ${divisionQuestions.edges.length - index}`,
                questionData: node,
            })
        })

        return rounds
    }

    const otherDivisionRounds = () => {
        const rounds: QuestionRounds = []
        Object.entries(indexQuestions).forEach(([key, value]) => {
            // only pull out questions from other divisions
            if (key !== `${userDivision}Questions` && key !== '__typename') {
                const questionsList: RateQuestionList | ContractQuestionList =
                    value

                // Reverse each division question so that we start at round 1 for each question, otherwise we get
                // mismatching rounds.
                Array.from([...questionsList.edges])
                    .sort(
                        (a, b) =>
                            new Date(a.node.createdAt).getTime() -
                            new Date(b.node.createdAt).getTime()
                    )
                    .forEach(({ node }, index) => {
                        if (!rounds[index]) {
                            rounds[index] = []
                        }

                        rounds[index].push({
                            roundTitle: `${node.division} - Round ${index + 1}`,
                            questionData: node,
                        })
                    })
            }
        })

        // return the round questions sorted to latest questions first and reverse rounds to latest round first
        return rounds
            .map((round) =>
                round.sort(
                    (a, b) =>
                        new Date(b.questionData.createdAt).getTime() -
                        new Date(a.questionData.createdAt).getTime()
                )
            )
            .reverse()
    }

    return (
        <>
            <section
                className={styles.yourQuestionSection}
                data-testid={'usersDivisionQuestions'}
            >
                <SectionHeader header="Your division's questions">
                    {userDivision && (
                        <NavLinkWithLogging
                            className="usa-button"
                            variant="unstyled"
                            to={`./${userDivision.toLowerCase()}/upload-questions`}
                        >
                            Add questions
                        </NavLinkWithLogging>
                    )}
                </SectionHeader>
                {currentDivisionRounds().length ? (
                    currentDivisionRounds().map((questionRound, index) =>
                        questionRound.map(({ roundTitle, questionData }) => (
                            <QuestionResponseRound
                                key={questionData.id}
                                question={questionData}
                                roundTitle={roundTitle}
                                currentUser={loggedInUser!}
                            />
                        ))
                    )
                ) : (
                    <p>No questions have been submitted yet.</p>
                )}
            </section>
            <section
                className={styles.questionSection}
                data-testid={'otherDivisionQuestions'}
            >
                <SectionHeader header="Other divisions' questions" />
                {otherDivisionRounds().length ? (
                    otherDivisionRounds().map((questionRound, index) =>
                        questionRound.map(({ roundTitle, questionData }) => (
                            <QuestionResponseRound
                                key={questionData.id}
                                question={questionData}
                                roundTitle={roundTitle}
                                currentUser={loggedInUser!}
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

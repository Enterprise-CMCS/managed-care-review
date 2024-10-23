import {
    ContractQuestionList,
    Division,
    IndexContractQuestionsPayload,
    IndexRateQuestionsPayload,
    RateQuestionList,
} from '../../../gen/gqlClient'
import type { QuestionRounds } from './QuestionResponseRound'
import { QuestionResponseRound } from './QuestionResponseRound'
import { NavLinkWithLogging, SectionHeader } from '../../../components'
import styles from '../QuestionResponse.module.scss'
import { useAuth } from '../../../contexts/AuthContext'

type IndexQuestionType =
    | IndexContractQuestionsPayload
    | IndexRateQuestionsPayload

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

        divisionQuestions.edges.forEach(({ node }, index) => {
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

                //reverse questions to the earliest question first as rounds would be mismatched when looping through two arrays of different lengths
                Array.from([...questionsList.edges])
                    .reverse()
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

        // return the rounds to latest questions first
        return rounds.reverse()
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
                            to={`./${userDivision}/upload-questions`}
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
                                currentUser={loggedInUser}
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
                <SectionHeader header="Other division's questions" />
                {otherDivisionRounds().length ? (
                    otherDivisionRounds().map((questionRound, index) =>
                        questionRound.map(({ roundTitle, questionData }) => (
                            <QuestionResponseRound
                                key={questionData.id}
                                question={questionData}
                                roundTitle={roundTitle}
                                currentUser={loggedInUser}
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

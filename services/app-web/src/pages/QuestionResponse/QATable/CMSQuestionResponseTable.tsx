import {
    ConsolidatedContractStatus,
    ContractQuestionList,
    Division,
    RateQuestionList,
    ConsolidatedRateStatus,
} from '../../../gen/gqlClient'
import type { QuestionRounds } from './QuestionResponseRound'
import { QuestionResponseRound } from './QuestionResponseRound'
import { NavLinkWithLogging, SectionHeader } from '../../../components'
import styles from '../QuestionResponse.module.scss'
import { useAuth } from '../../../contexts/AuthContext'
import { IndexQuestionType } from '../QuestionResponseHelpers'

type CMSQuestionResponseTableProps = {
    indexQuestions: IndexQuestionType
    consolidatedStatus?: ConsolidatedContractStatus | ConsolidatedRateStatus
    userDivision?: Division
}

// Reusable function for sorting rounds by createdAt and reversing
export const sortRoundsByDate = (rounds: QuestionRounds): QuestionRounds =>
    rounds
        .map((round) =>
            round.sort(
                (a, b) =>
                    new Date(b.questionData.createdAt).getTime() -
                    new Date(a.questionData.createdAt).getTime()
            )
        )
        .reverse()

// Collects questions into rounds by users division and other divisions. Then sorted by created at date.
const sortQuestionRounds = (
    indexQuestions: IndexQuestionType,
    userDivision?: Division
) => {
    const usersRounds: QuestionRounds = []
    const otherRounds: QuestionRounds = []

    Object.entries(indexQuestions).forEach(([key, value]) => {
        // skip iterating on typename.
        if (key === '__typename') return
        const currentUserDivision = key === `${userDivision}Questions`
        // set reference to add question to
        const rounds = currentUserDivision ? usersRounds : otherRounds
        // only pull out questions from other divisions
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
                if (!rounds[index]) {
                    rounds[index] = []
                }

                rounds[index].push({
                    roundTitle: currentUserDivision
                        ? `Round ${node.round}`
                        : `${node.division} - Round ${node.round}`,
                    questionData: node,
                })
            })
    })

    return {
        usersRounds: sortRoundsByDate(usersRounds),
        otherRounds: sortRoundsByDate(otherRounds),
    }
}

export const CMSQuestionResponseTable = ({
    indexQuestions,
    consolidatedStatus,
    userDivision,
}: CMSQuestionResponseTableProps) => {
    const { loggedInUser } = useAuth()
    const canAddQuestions =
        !['APPROVED', 'WITHDRAWN'].includes(consolidatedStatus!) && userDivision

    const { usersRounds, otherRounds } = sortQuestionRounds(
        indexQuestions,
        userDivision
    )

    return (
        <>
            <section
                className={styles.yourQuestionSection}
                data-testid={'usersDivisionQuestions'}
            >
                <SectionHeader header="Your division's questions">
                    {canAddQuestions && (
                        <NavLinkWithLogging
                            className="usa-button"
                            variant="unstyled"
                            to={`./${userDivision.toLowerCase()}/upload-questions`}
                        >
                            Add questions
                        </NavLinkWithLogging>
                    )}
                </SectionHeader>
                {usersRounds.length ? (
                    usersRounds.map((questionRound, index) =>
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
                {otherRounds.length ? (
                    otherRounds.map((questionRound, index) =>
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

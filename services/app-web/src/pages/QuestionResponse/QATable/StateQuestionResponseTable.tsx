import {
    IndexContractQuestionsPayload,
    IndexRateQuestionsPayload,
} from '../../../gen/gqlClient'
import { SectionHeader } from '../../../components'
import styles from '../QuestionResponse.module.scss'
import { useAuth } from '../../../contexts/AuthContext'
import { extractQuestions, QuestionData } from '../QuestionResponseHelpers'
import { QATable } from './QATable'

type Division = 'DMCO' |  'DMCP' | 'OACT'
type IndexQuestionType =
    | IndexContractQuestionsPayload
    | IndexRateQuestionsPayload

type StateQuestionResponseTableProps = {
    indexQuestions: IndexQuestionType
}
type QuestionTableDataType = {
    division: Division // eventually rip out division logic, replace with answered/unanswered
    questions: QuestionData[]
}
export const StateQuestionResponseTable = ({
    indexQuestions,
}: StateQuestionResponseTableProps) => {
    const { loggedInUser } = useAuth()
    const questions: QuestionTableDataType[] = []
    const divisions: Division[] =   ['DMCO', 'DMCP', 'OACT']
    divisions.forEach(
        (division) =>
            indexQuestions[`${division}Questions`].totalCount &&
            questions.push({
                division: division,
                questions: extractQuestions(
                    indexQuestions[`${division}Questions`].edges
                ),
            })
    )
const mapQASections = () =>
    questions.map((divisionQuestions) => (
        <section
            key={divisionQuestions.division}
            className={styles.questionSection}
            data-testid={`${divisionQuestions.division.toLowerCase()}-qa-section`}
        >
            <h4>{`Asked by ${divisionQuestions.division}`}</h4>
            {divisionQuestions.questions.map((question, index) => (
                <QATable
                    key={question.id}
                    question={question}
                    division={divisionQuestions.division}
                    round={divisionQuestions.questions.length - index}
                    user={loggedInUser!}
                />
            ))}
        </section>
    ))

    return (
        <>

            <section
                className={styles.questionSection}
                data-testid={'questions'}
            >
                <SectionHeader header="All questions" />
                {questions.length ? (
                  mapQASections()
                ) : (
                    <p>No questions have been submitted yet.</p>
                )}
            </section>
        </>
    )
}

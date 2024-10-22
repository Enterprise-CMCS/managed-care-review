import { RateQuestion, ContractQuestion, User } from '../../../gen/gqlClient'
import styles from './QATable.module.scss'
import { LinkWithLogging } from '../../../components'
import { formatCalendarDate } from '../../../common-code/dateHelpers'

type QuestionType =
    | Omit<RateQuestion, 'rateID'>
    | Omit<ContractQuestion, 'contractID'>

export type RoundData = {
    roundTitle: string
    questionData: QuestionType
}

export type QuestionRounds = RoundData[][]

export const QuestionResponseRound = ({
    question,
    roundTitle,
    currentUser,
}: {
    question: QuestionType
    roundTitle: string
    currentUser?: User
}) => {
    // Combines question and response documents and sorts them in desc order.
    const documents = [
        ...question.documents.map((doc) => ({
            ...doc,
            createdAt: question.createdAt,
            addedBy: question.addedBy,
        })),
        ...question.responses.flatMap((response) =>
            response.documents.map((doc) => ({
                ...doc,
                createdAt: response.createdAt,
                addedBy: response.addedBy,
            }))
        ),
    ].sort((a, b) =>
        new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()
            ? -1
            : 1
    )

    const getAddedByName = (addedBy: User) => {
        if (currentUser?.id === addedBy.id) {
            return 'You'
        }
        if (
            addedBy.__typename === 'CMSUser' ||
            addedBy.__typename === 'CMSApproverUser'
        ) {
            return `${addedBy.givenName} (CMS)`
        }
        if (addedBy.__typename === 'StateUser') {
            return `${addedBy.givenName} (${addedBy.state.code})`
        }
        return `${addedBy.givenName}`
    }

    return (
        <div>
            <div className={styles.tableHeader}>
                <h4>{roundTitle}</h4>
            </div>
            <table
                className={`borderTopLinearGradient ${styles.qaDocumentTable}`}
            >
                <thead>
                    <tr>
                        <th scope="col">Document name</th>
                        <th scope="col">Date added</th>
                        <th scope="col">Added by</th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc, index) => (
                        <tr key={doc.name + index}>
                            <td>
                                {doc.downloadURL ? (
                                    <LinkWithLogging
                                        className={styles.inlineLink}
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.downloadURL}
                                        target="_blank"
                                    >
                                        {doc.name}
                                    </LinkWithLogging>
                                ) : (
                                    doc.name
                                )}
                            </td>
                            <td>
                                {formatCalendarDate(
                                    doc.createdAt,
                                    'America/New_York'
                                )}
                            </td>
                            <td>{getAddedByName(doc.addedBy)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

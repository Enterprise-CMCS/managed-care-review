import styles from './QATable.module.scss'
import { User } from '../../../gen/gqlClient'
import { LinkWithLogging } from '../../../components'
import { formatCalendarDate } from '@mc-review/dates'
import { getAddedByName } from '../QuestionResponseHelpers'
import { QuestionDisplayDocument } from '../QuestionResponseHelpers/questionResponseHelpers'

type QuestionDisplayTablePropType = {
    documents: QuestionDisplayDocument[]
    user: User
    onlyDisplayInitial: boolean
} & React.HtmlHTMLAttributes<HTMLTableElement>

export const QuestionDisplayTable = ({
    documents,
    user,
    onlyDisplayInitial, // used when we only care about initial question
    ...rest
}: QuestionDisplayTablePropType) => {
    const displayDocuments = onlyDisplayInitial
        ? [documents[documents.length - 1]]
        : documents
    return (
        <table
            className={`borderTopLinearGradient ${styles.qaDocumentTable}`}
            {...rest}
        >
            <thead>
                <tr>
                    <th scope="col">Document name</th>
                    <th scope="col">Date added</th>
                    <th scope="col">Added by</th>
                </tr>
            </thead>
            <tbody>
                {displayDocuments.map((doc, index) => (
                    <tr key={doc.name + index}>
                        <th scope="row">
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
                        </th>
                        <td>
                            {formatCalendarDate(
                                doc.createdAt,
                                'America/Los_Angeles'
                            )}
                        </td>
                        <td>{getAddedByName(user, doc.addedBy)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

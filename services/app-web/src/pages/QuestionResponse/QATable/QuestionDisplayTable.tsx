import styles from './QATable.module.scss'
import { User } from '../../../gen/gqlClient'
import { LinkWithLogging, NavLinkWithLogging } from '../../../components'
import { formatCalendarDate } from '@mc-review/dates'
import { getAddedByName } from '../QuestionResponseHelpers'
import { QuestionDisplayDocument } from '../QuestionResponseHelpers/questionResponseHelpers'

type QuestionDisplayTablePropType = {
    documents: QuestionDisplayDocument[]
    user: User
    onlyDisplayInitial: boolean
    // When true, responses in this view may be deleted (set by the contract Q&A
    // landing view). The user permission check lives here in the table: the
    // delete-response column only renders for admins. Every other consumer omits
    // this and the table renders unchanged.
    allowDeleteResponse?: boolean
} & React.HtmlHTMLAttributes<HTMLTableElement>

export const QuestionDisplayTable = ({
    documents,
    user,
    onlyDisplayInitial, // used when we only care about initial question documents
    allowDeleteResponse = false,
    ...rest
}: QuestionDisplayTablePropType) => {
    const displayDocuments = onlyDisplayInitial
        ? documents.filter((doc) => doc.addedBy.__typename !== 'StateUser')
        : documents

    // Only admins may soft-delete a response, so the delete column is gated on
    // the current user's role rather than trusting the caller.
    const canDeleteResponse =
        allowDeleteResponse && user.__typename === 'AdminUser'

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
                    {canDeleteResponse && <th scope="col">Actions</th>}
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
                        {canDeleteResponse && (
                            <td>
                                {doc.responseID &&
                                doc.questionID &&
                                doc.division ? (
                                    <NavLinkWithLogging
                                        className={styles.inlineLink}
                                        variant="unstyled"
                                        to={`./${doc.division.toLowerCase()}/${doc.questionID}/${doc.responseID}/delete-response`}
                                    >
                                        Delete response
                                    </NavLinkWithLogging>
                                ) : null}
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

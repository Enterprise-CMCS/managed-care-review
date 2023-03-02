import styles from './QATable.module.scss'
import React from 'react'
import { CmsUser, User } from '../../../gen/gqlClient'
import { Link } from '@trussworks/react-uswds'
import dayjs from 'dayjs'

export type QuestionDocumentWithLink = {
    name: string
    url: string | null
}

export type QuestionData = {
    id: string
    pkgID: string
    createdAt: Date
    addedBy: CmsUser
    documents: QuestionDocumentWithLink[]
}

export const QATable = ({
    question,
    user,
}: {
    question: QuestionData
    user: User
}) => {
    const getAddedByName = (addedBy: User) => {
        if (user.id === addedBy.id) {
            return 'You'
        }
        if (addedBy.__typename === 'CMSUser') {
            return `${addedBy.givenName} (CMS)`
        }
        if (addedBy.__typename === 'StateUser') {
            return `${addedBy.givenName} (${addedBy.state})`
        }
        return `${addedBy.givenName}`
    }

    return (
        <table
            className={`borderTopLinearGradient ${styles.qaDocumentTable}`}
            data-testid={`${question.id}-table`}
        >
            <thead>
                <tr>
                    <th scope="col">Document name</th>
                    <th scope="col">Date added</th>
                    <th scope="col">Added by</th>
                </tr>
            </thead>
            <tbody>
                {question.documents.map((doc, index) => (
                    <tr key={doc.name + index}>
                        <td>
                            {doc.url ? (
                                <Link
                                    className={styles.inlineLink}
                                    aria-label={`${doc.name} (opens in new window)`}
                                    href={doc.url}
                                    target="_blank"
                                >
                                    {doc.name}
                                </Link>
                            ) : (
                                doc.name
                            )}
                        </td>
                        <td>{dayjs(question.createdAt).format('M/D/YY')}</td>
                        <td>{getAddedByName(question.addedBy)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

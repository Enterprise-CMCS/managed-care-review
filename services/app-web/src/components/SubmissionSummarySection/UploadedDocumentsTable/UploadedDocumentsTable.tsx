import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Link } from '@trussworks/react-uswds'

import styles from './UploadedDocumentsTable.module.scss'

import { useS3 } from '../../../contexts/S3Context'
import { Document } from '../../../gen/gqlClient'

export type UploadedDocumentsTableProps = {
    documents: Document[]
    caption: string | null
    documentCategory: string
    isSupportingDocuments?: boolean 
    isSubmitted?: boolean
}

type DocumentWithLink = { url: string | null } & Document

const isBothContractAndRateSupporting = (doc: Document) =>
doc.documentCategories.includes('CONTRACT_RELATED') &&
doc.documentCategories.includes('RATES_RELATED') 

export const UploadedDocumentsTable = ({
    documents,
    caption,
    documentCategory,
    isSupportingDocuments = false,
    isSubmitted = false
}: UploadedDocumentsTableProps): React.ReactElement => {
    const { getURL, getKey } = useS3()
    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])
    const shouldShowEditButton = !isSubmitted && isSupportingDocuments
    const shouldShowAsteriskExplainer = refreshedDocs.some(
        (doc) =>
           isBothContractAndRateSupporting(doc)
    )
    const borderTopGradientStyles= `borderTopLinearGradient ${
        styles.uploadedDocumentsTable
    }`
    const supportingDocsTopMarginStyles= isSupportingDocuments ? styles.withMarginTop : ''
     const tableCaptionJSX = (
        <>
            <span>{caption}</span>
            {shouldShowEditButton && (
                <Link
                    variant="unstyled"
                    asCustom={NavLink}
                    className="usa-button usa-button--outline"
                    to="documents"
                >
                    Edit <span className="srOnly">{caption}</span>
                </Link>
            )}
        </>
    )


    
    useEffect(() => {
        const refreshDocuments = async () => {
            const newDocuments = await Promise.all(
                documents.map(async (doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key)
                        return {
                            ...doc,
                            url: null,
                        }

                    const documentLink = await getURL(key)
                    return {
                        ...doc,
                        url: documentLink,
                    }
                })
            ).catch((err) => {
                console.log(err)
                return []
            })
            setRefreshedDocs(newDocuments)
        }

        void refreshDocuments()
    }, [documents, getKey, getURL])

    // Empty State
    if (refreshedDocs.length < 1) {
        return (
            <div className={supportingDocsTopMarginStyles}>
                <b className={styles.captionContainer}>{tableCaptionJSX}</b>
                <p className={`${borderTopGradientStyles} ${styles.supportingDocsEmpty}`}>No supporting documents</p>
            </div>
        )
    }
                
    return (
        <>
            <table className={`${borderTopGradientStyles} ${supportingDocsTopMarginStyles}`}>
                <caption className="text-bold">
                    <div className={styles.captionContainer}>
                      {tableCaptionJSX}
                    </div>
                </caption>
                <thead>
                    <tr>
                        <th scope="col">Document name</th>
                        <th scope="col"></th>
                        <th scope="col">Document category</th>
                    </tr>
                </thead>
                <tbody>
                    {refreshedDocs.map((doc) => (
                        <tr key={doc.name}>
                            {doc.url ? (
                                <td>
                                    <Link
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.url}
                                        variant="external"
                                        target="_blank"
                                    >
                                        {isSupportingDocuments &&
                                        isBothContractAndRateSupporting(doc)
                                            ? `*${doc.name}`
                                            : doc.name}
                                    </Link>
                                </td>
                            ) : (
                                <td>{doc.name}</td>
                            )}
                            <td></td>
                            <td>{documentCategory}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {shouldShowAsteriskExplainer && (
                <span>
                    * Listed as both a contract and rate supporting document
                </span>
            )}
        </>
    )
}

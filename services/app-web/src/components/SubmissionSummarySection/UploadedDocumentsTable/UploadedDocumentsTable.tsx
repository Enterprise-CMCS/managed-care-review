import React, { useEffect, useState } from 'react'
import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import dayjs from 'dayjs'
import { SubmissionDocument } from '../../../common-code/healthPlanFormDataType'
import styles from './UploadedDocumentsTable.module.scss'
import { usePreviousSubmission } from '../../../hooks'
import { SharedRateCertDisplay } from '../../../common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'
import { DocumentTag } from './DocumentTag'
import { useDocument } from '../../../hooks/useDocument'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'
import { getDocumentKey } from '../../../documentHelpers'
import { useAuth } from '../../../contexts/AuthContext'

export type UploadedDocumentsTableProps = {
    documents: SubmissionDocument[]
    caption: string | null
    packagesWithSharedRateCerts?: SharedRateCertDisplay[]
    documentDateLookupTable: DocumentDateLookupTableType
    isSupportingDocuments?: boolean
    documentCategory?: string // if this prop is not included, do not show category column
    isEditing?: boolean // by default assume we are on summary page, if true, assume review and submit page
}

export const UploadedDocumentsTable = ({
    documents,
    caption,
    documentCategory,
    packagesWithSharedRateCerts,
    isSupportingDocuments = false,
    documentDateLookupTable,
    isEditing = false,
}: UploadedDocumentsTableProps): React.ReactElement => {
    const initialDocState = documents.map((doc) => ({
        ...doc,
        url: null,
        s3Key: null,
    }))
    const { loggedInUser } = useAuth()
    const isCMSUser = loggedInUser?.__typename === 'CMSUser'
    const { getDocumentsWithS3KeyAndUrl } = useDocument()
    const [refreshedDocs, setRefreshedDocs] =
        useState<DocumentWithS3Data[]>(initialDocState)
    const shouldShowEditButton = isEditing && isSupportingDocuments
    const shouldShowAsteriskExplainer = refreshedDocs.some((doc) =>
        isBothContractAndRateSupporting(doc)
    )
    // canDisplayDateAddedForDocument -  guards against passing in null or undefined to dayjs
    // dates will be undefined in lookup table we are dealing with a new initial submission
    const canDisplayDateAddedForDocument = (doc: DocumentWithS3Data) => {
        const documentLookupKey = getDocumentKey(doc)
        return documentLookupKey && documentDateLookupTable[documentLookupKey]
    }

    const shouldHaveNewTag = (doc: DocumentWithS3Data) => {
        const documentLookupKey = getDocumentKey(doc)
        if (!isCMSUser) {
            return false // design requirement, don't show new tag to state users  on review submit
        }

        if (!documentDateLookupTable || !doc || !doc.s3Key) {
            return false // this is a document with bad s3 data
        }
        const documentDate = documentDateLookupTable?.[documentLookupKey]
        const previousSubmissionDate =
            documentDateLookupTable.previousSubmissionDate

        if (!documentDate || !previousSubmissionDate) {
            return false // this document is on an initial submission or not submitted yet
        }
        return documentDate > previousSubmissionDate
    }

    const hasSharedRateCert =
        (packagesWithSharedRateCerts &&
            packagesWithSharedRateCerts.length > 0) ||
        false
    const isPreviousSubmission = usePreviousSubmission()
    const showSharedInfo = hasSharedRateCert && !isPreviousSubmission
    const borderTopGradientStyles = `borderTopLinearGradient ${styles.uploadedDocumentsTable}`
    const supportingDocsTopMarginStyles = isSupportingDocuments
        ? styles.withMarginTop
        : ''

    const tableCaptionJSX = (
        <>
            <span>{caption}</span>
            {shouldShowEditButton && (
                <Link
                    variant="unstyled"
                    asCustom={NavLink}
                    className="usa-button usa-button--outline"
                    to="../documents"
                >
                    Edit <span className="srOnly">{caption}</span>
                </Link>
            )}
        </>
    )

    useEffect(() => {
        const refreshDocuments = async () => {
            const newDocuments = (await getDocumentsWithS3KeyAndUrl(
                documents,
                'HEALTH_PLAN_DOCS'
            )) as DocumentWithS3Data[]
            if (newDocuments.length) {
                setRefreshedDocs(newDocuments)
            }
        }

        void refreshDocuments()
    }, [documents, getDocumentsWithS3KeyAndUrl])

    // Empty State
    if (refreshedDocs.length === 0) {
        return (
            <div className={supportingDocsTopMarginStyles}>
                <b className={styles.captionContainer}>{tableCaptionJSX}</b>
                <p
                    className={`${borderTopGradientStyles} ${styles.supportingDocsEmpty}`}
                >
                    {isSupportingDocuments
                        ? 'No supporting documents'
                        : 'No documents'}
                </p>
            </div>
        )
    }
    return (
        <>
            <table
                className={`${borderTopGradientStyles} ${supportingDocsTopMarginStyles}`}
            >
                <caption className="text-bold">
                    <div className={styles.captionContainer}>
                        {tableCaptionJSX}
                    </div>
                </caption>
                <thead>
                    <tr>
                        <th scope="col">Document name</th>
                        <th scope="col">Date added</th>
                        {documentCategory && (
                            <th scope="col">Document category</th>
                        )}
                        {showSharedInfo && (
                            <th scope="col">Linked submissions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {refreshedDocs.map((doc) => (
                        <tr key={doc.name}>
                            {doc.url && doc.s3Key ? (
                                <td>
                                    <DocumentTag
                                        isNew={shouldHaveNewTag(doc)}
                                        isShared={showSharedInfo}
                                    />
                                    <Link
                                        className={styles.inlineLink}
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.url}
                                        target="_blank"
                                    >
                                        {isSupportingDocuments &&
                                        isBothContractAndRateSupporting(doc)
                                            ? `*${doc.name}`
                                            : doc.name}
                                    </Link>
                                </td>
                            ) : (
                                <td>
                                    <DocumentTag
                                        isNew={shouldHaveNewTag(doc)}
                                    />
                                    {doc.name}
                                </td>
                            )}
                            <td>
                                {canDisplayDateAddedForDocument(doc) ? (
                                    dayjs(
                                        documentDateLookupTable[
                                            getDocumentKey(doc)
                                        ]
                                    ).format('M/D/YY')
                                ) : (
                                    <span className="srOnly">N/A</span>
                                )}
                            </td>
                            {documentCategory && <td>{documentCategory}</td>}
                            {showSharedInfo
                                ? packagesWithSharedRateCerts && (
                                      <td>
                                          {linkedPackagesList({
                                              unlinkDrafts: Boolean(isCMSUser),
                                              packages:
                                                  packagesWithSharedRateCerts,
                                          })}
                                      </td>
                                  )
                                : null}
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

// TODO - get the api to return documents in this state rather than frontend generating on demand
type DocumentWithS3Data = {
    url: string | null
    s3Key: string | null
} & SubmissionDocument

const isBothContractAndRateSupporting = (doc: SubmissionDocument) =>
    doc.documentCategories.includes('CONTRACT_RELATED') &&
    doc.documentCategories.includes('RATES_RELATED')

type LinkedPackagesListProps = {
    unlinkDrafts: boolean
    packages: SharedRateCertDisplay[]
}

const linkedPackagesList = ({
    unlinkDrafts,
    packages,
}: LinkedPackagesListProps): React.ReactElement[] => {
    return packages.map((item, index) => {
        const maybeComma = index > 0 ? ', ' : ''
        const linkedPackageIsDraft =
            item.packageName && item.packageName.includes('(Draft)')

        if (linkedPackageIsDraft && unlinkDrafts) {
            return (
                <span key={item.packageId}>
                    {maybeComma}
                    <span>{item.packageName}</span>
                </span>
            )
        } else {
            return (
                <span key={item.packageId}>
                    {maybeComma}
                    <Link
                        asCustom={NavLink}
                        to={`/submissions/${item.packageId}`}
                    >
                        {item.packageName}
                    </Link>
                </span>
            )
        }
    })
}

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
import { getDocumentKey } from '../../../documentHelpers/getDocumentKey'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'
export type UploadedDocumentsTableProps = {
    documents: SubmissionDocument[]
    caption: string | null
    documentDateLookupTable: DocumentDateLookupTableType,
    packagesWithSharedRateCerts?: SharedRateCertDisplay[]
    isSupportingDocuments?: boolean
    documentCategory?: string // if this prop is not included, do not show category column
    isEditing?: boolean
    isCMSUser?: boolean
}

type DocumentWithLink = { url: string | null } & SubmissionDocument

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

export const UploadedDocumentsTable = ({
    documents,
    caption,
    documentCategory,
    documentDateLookupTable,
    packagesWithSharedRateCerts,
    isSupportingDocuments = false,
    isEditing = false,
    isCMSUser,
}: UploadedDocumentsTableProps): React.ReactElement => {
    const initialDocState = documents.map((doc) => ({
        ...doc,
        url: null,
    }))
    const { getDocumentsUrl } = useDocument()
    const [refreshedDocs, setRefreshedDocs] =
        useState<DocumentWithLink[]>(initialDocState)
    const shouldShowEditButton = isEditing && isSupportingDocuments
    const shouldShowAsteriskExplainer = refreshedDocs.some((doc) =>
        isBothContractAndRateSupporting(doc)
    )
    const shouldHaveNewTag = (doc: SubmissionDocument) => {
        const documentKey = getDocumentKey(doc)
        if ( documentDateLookupTable[documentKey] === undefined  ||   documentDateLookupTable.previousSubmissionDate === undefined){
            return false // this is a document on a draft submission
        }
        return (
        isCMSUser &&
         documentDateLookupTable['documentKey'] >
        documentDateLookupTable.previousSubmissionDate
        )
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
            const newDocuments = (await getDocumentsUrl(
                documents,
                'HEALTH_PLAN_DOCS'
            )) as DocumentWithLink[]
            if (newDocuments.length) {
                setRefreshedDocs(newDocuments)
            }
        }

        void refreshDocuments()
    }, [documents, getDocumentsUrl])
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
                            {doc.url ? (
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
                                {documentDateLookupTable
                                    ? dayjs(
                                          documentDateLookupTable[
                                              getDocumentKey(doc)
                                          ]
                                      ).format('M/D/YY')
                                    : ''}
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

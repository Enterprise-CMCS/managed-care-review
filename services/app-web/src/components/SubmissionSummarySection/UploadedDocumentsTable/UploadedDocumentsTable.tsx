import React, { useEffect, useState } from 'react'
import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import dayjs from 'dayjs'
import styles from './UploadedDocumentsTable.module.scss'
import {
    SharedRateCertDisplay,
    SubmissionDocument,
} from '../../../common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'
import { DocumentTag } from './DocumentTag'
import { useDocument } from '../../../hooks/useDocument'
import { useAuth } from '../../../contexts/AuthContext'
import { DataDetailMissingField } from '../../DataDetail/DataDetailMissingField'
import { GenericDocument } from '../../../gen/gqlClient'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'

// V2 API migration note: intentionally trying to avoid making V2 version of this reuseable sub component since it has such a contained focus (on displaying documents only).
// Use props to pass needed information and seek to make content as domain agnostic as possible.

// This is used to convert from deprecated FE domain types from protos to GQL GenericDocuments by added in a dateAdded
export const convertFromSubmissionDocumentsToGenericDocuments = (
    deprecatedDocs: SubmissionDocument[],
    dateTableLookup: DocumentDateLookupTableType
): GenericDocument[] => {
    return deprecatedDocs.map((doc) => {
        return {
            ...doc,
            dateAdded: dateTableLookup[doc.sha256],
        }
    })
}
export type UploadedDocumentsTableProps = {
    documents: GenericDocument[]
    caption: string | null
    previousSubmissionDate: Date | null // used to calculate NEW tag based on doc dateAdded
    hideDynamicFeedback: boolean // used to determine if we display static data for submission summary experience or if we display dynamic feedback UI (validations, edit buttons) like on review submit experience
    packagesWithSharedRateCerts?: SharedRateCertDisplay[] // deprecated - could be deleted after we resolve all historical data linked rates
    isSupportingDocuments?: boolean // used to calculate empty state and styles around the secondary supporting docs tables - would be nice to remove this in favor of more domain agnostic prop such as 'emptyStateText'
    multipleDocumentsAllowed?: boolean // used to determined if we display validations based on doc list length
    documentCategory?: string // used to determine if we display document category column

}

export const UploadedDocumentsTable = ({
    documents,
    caption,
    documentCategory,
    packagesWithSharedRateCerts,
    previousSubmissionDate,
    isSupportingDocuments = false,
    multipleDocumentsAllowed = true,
    hideDynamicFeedback = false,
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
    const shouldShowEditButton = !hideDynamicFeedback && isSupportingDocuments // at this point only contract supporting documents need the inline EDIT button - this can be deleted when we move supporting docs to ContractDetails page

    // canDisplayDateAddedForDocument -  guards against passing in null or undefined to dayjs
    // don't display on new initial submission
    const canDisplayDateAddedForDocument = (doc: DocumentWithS3Data) => {
        return doc.dateAdded && previousSubmissionDate
    }

    const shouldHaveNewTag = (doc: DocumentWithS3Data) => {
        if (!isCMSUser) {
            return false // design requirement, don't show new tag to state users on review submit
        }

        if (!doc || !doc.s3Key) {
            return false // this is a document with bad s3 data
        }

        if (!previousSubmissionDate) {
            return false // this document is on an initial submission or not submitted yet
        }
        return doc.dateAdded > previousSubmissionDate
    }

    // show legacy shared rates across submissions (this is feature replaced by linked rates)
    // to cms users always when data available, to state users only when linked rates flag is off
    const showLegacySharedRatesAcross =  Boolean(packagesWithSharedRateCerts && packagesWithSharedRateCerts.length > 0)

    const borderTopGradientStyles = `borderTopLinearGradient ${styles.uploadedDocumentsTable}`
    const supportingDocsTopMarginStyles = isSupportingDocuments
        ? styles.withMarginTop
        : ''

    const hasMultipleDocs = !multipleDocumentsAllowed && documents.length > 1
    const tableCaptionJSX = (
        <>
            <span>{caption}</span>
            {shouldShowEditButton && (
                <Link
                    variant="unstyled"
                    asCustom={NavLink}
                    className="usa-button usa-button--outline edit-btn"
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
                <div className={styles.captionContainer}>{tableCaptionJSX}</div>
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
                <caption>
                    <div className={styles.captionContainer}>
                        {tableCaptionJSX}
                    </div>
                    { hasMultipleDocs && !hideDynamicFeedback && (
                        <DataDetailMissingField
                            classname={styles.missingInfo}
                            requiredText="Only one document is allowed for a rate
                        certification. You must remove documents before
                        continuing."
                        />
                    )}
                </caption>
                <thead>
                    <tr>
                        <th scope="col">Document name</th>
                        <th scope="col">Date added</th>
                        {documentCategory && (
                            <th scope="col">Document category</th>
                        )}
                        {showLegacySharedRatesAcross && (
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
                                        isShared={showLegacySharedRatesAcross}
                                    />
                                    <Link
                                        className={styles.inlineLink}
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.url}
                                        target="_blank"
                                    >
                                        {doc.name}
                                    </Link>
                                </td>
                            ) : (
                                <td>
                                    <DocumentTag
                                        isNew={shouldHaveNewTag(doc)}
                                        isShared={showLegacySharedRatesAcross}
                                    />
                                    {doc.name}
                                </td>
                            )}
                            <td>
                                {canDisplayDateAddedForDocument(doc) ? (
                                    dayjs(doc.dateAdded).format('M/D/YY')
                                ) : (
                                    <span className="srOnly">N/A</span>
                                )}
                            </td>
                            {documentCategory && <td>{documentCategory}</td>}
                            {showLegacySharedRatesAcross && (
                                      <td>
                                          {linkedPackagesList({
                                              packages:
                                                  packagesWithSharedRateCerts ?? [],
                                          })}
                                      </td>
                                  )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )
}

// TODO - get the api to return documents in this state rather than frontend generating on demand
type DocumentWithS3Data = {
    url: string | null
    s3Key: string | null
} & GenericDocument

type LinkedPackagesListProps = {
    packages: SharedRateCertDisplay[]
}

const linkedPackagesList = ({
    packages,
}: LinkedPackagesListProps): React.ReactElement[] => {
    return packages.map((item, index) => {
        const maybeComma = index > 0 ? ', ' : ''

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
        })
}

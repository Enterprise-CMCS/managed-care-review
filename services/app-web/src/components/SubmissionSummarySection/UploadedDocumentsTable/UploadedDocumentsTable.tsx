import React, { useEffect, useState } from 'react'
import { dayjs } from '../../../common-code/dateHelpers/dayjs'
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
import { LinkWithLogging, NavLinkWithLogging } from '../../TealiumLogging'
import { hasCMSUserPermissions } from '../../../gqlHelpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
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
    hideDynamicFeedback: boolean // used to determine if we display static data the dynamic feedback UI (validations, edit buttons). If true, assume submission summary experience, if false, assume review submit experience
    packagesWithSharedRateCerts?: SharedRateCertDisplay[] // deprecated - could be deleted after we resolve all historical data linked rates
    isInitialSubmission?: boolean // used to determine if we display the date added field
    isSupportingDocuments?: boolean // used to calculate empty state and styles around the secondary supporting docs tables - would be nice to remove this in favor of more domain agnostic prop such as 'emptyStateText'
    multipleDocumentsAllowed?: boolean // used to determined if we display validations based on doc list length
    documentCategory?: string // used to determine if we display document category column
    isLinkedRate?: boolean
}

export const UploadedDocumentsTable = ({
    documents,
    caption,
    documentCategory,
    packagesWithSharedRateCerts,
    previousSubmissionDate,
    isInitialSubmission = false,
    isSupportingDocuments = false,
    multipleDocumentsAllowed = true,
    hideDynamicFeedback = false,
    isLinkedRate = false,
}: UploadedDocumentsTableProps): React.ReactElement => {
    const initialDocState = documents.map((doc) => ({
        ...doc,
        url: null,
        s3Key: null,
    }))
    const { loggedInUser } = useAuth()
    const isStateUser = loggedInUser?.__typename === 'StateUser'
    const isCMSUser = hasCMSUserPermissions(loggedInUser)
    const ldClient = useLDClient()
    const { getDocumentsWithS3KeyAndUrl } = useDocument()
    const [refreshedDocs, setRefreshedDocs] =
        useState<DocumentWithS3Data[]>(initialDocState)
    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )
    const shouldShowEditButton =
        !hideDynamicFeedback && isSupportingDocuments && !hideSupportingDocs // at this point only contract supporting documents need the inline EDIT button - this can be deleted when we move supporting docs to ContractDetails page
    // canDisplayDateForDocument -  guards against passing in null or undefined to dayjs
    // don't display prior to the initial submission
    const canDisplayDateAddedForDocument = (doc: DocumentWithS3Data) => {
        return (
            (doc.dateAdded && previousSubmissionDate) ||
            (doc.dateAdded && isInitialSubmission) ||
            (doc.dateAdded && isLinkedRate)
        )
    }

    const shouldHaveNewTag = (doc: DocumentWithS3Data) => {
        if (!isCMSUser) {
            return false // design requirement, don't show new tag to state users on review submit
        }

        if (!doc || !doc.s3Key) {
            return false // this is a document with bad s3 data
        }

        if (!previousSubmissionDate) {
            return false // design require, don't show new tags on initial submission
        }
        // compare the last submission with this documents first seen on package date (date added)
        return dayjs(doc.dateAdded)
            .utc()
            .isSameOrAfter(dayjs(previousSubmissionDate).utc())
    }

    // show legacy shared rates across submissions (this is feature replaced by linked rates)
    // to cms users always when data available, to state users only when linked rates flag is off
    const showLegacySharedRatesAcross = Boolean(
        (hideDynamicFeedback ? !isStateUser : true) &&
            packagesWithSharedRateCerts &&
            packagesWithSharedRateCerts.length > 0
    )

    const borderTopGradientStyles = `borderTopLinearGradient ${styles.uploadedDocumentsTable}`
    const supportingDocsTopMarginStyles = isSupportingDocuments
        ? styles.withMarginTop
        : ''

    const hasMultipleDocs = !multipleDocumentsAllowed && documents.length > 1
    const tableCaptionJSX = (
        <>
            <span>{caption}</span>
            {shouldShowEditButton && (
                <NavLinkWithLogging
                    variant="unstyled"
                    className="usa-button usa-button--outline edit-btn"
                    to="../documents"
                >
                    Edit <span className="srOnly">{caption}</span>
                </NavLinkWithLogging>
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
                    {hasMultipleDocs && !hideDynamicFeedback && (
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
                                    <LinkWithLogging
                                        className={styles.inlineLink}
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.url}
                                        target="_blank"
                                    >
                                        {doc.name}
                                    </LinkWithLogging>
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
                                    formatCalendarDate(
                                        doc.dateAdded,
                                        'America/New_York'
                                    )
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
                <NavLinkWithLogging to={`/submissions/${item.packageId}`}>
                    {item.packageName}
                </NavLinkWithLogging>
            </span>
        )
    })
}

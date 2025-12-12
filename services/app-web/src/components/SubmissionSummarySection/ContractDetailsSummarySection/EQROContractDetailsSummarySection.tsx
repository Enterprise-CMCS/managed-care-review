import React from 'react'
import {
    Contract,
    ContractRevision,
    UnlockedContract,
} from '../../../gen/gqlClient'
import { useParams } from 'react-router-dom'
import { SectionHeader } from '../../SectionHeader'
import { UploadedDocumentsTable } from '..'
import { MultiColumnGrid } from '../../MultiColumnGrid'
import { SectionCard } from '../../SectionCard'
import { DocumentHeader } from '../../DocumentHeader/DocumentHeader'
import { usePreviousSubmission } from '../../../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import {
    getIndexFromRevisionVersion,
    getLastContractSubmission,
    getPackageSubmissionAtIndex,
    getVisibleLatestContractFormData,
} from '@mc-review/submissions'
import styles from '../SubmissionSummarySection.module.scss'
import {
    ContractEffectiveDateSummary,
    EQROModifiedProvisionSummary,
    NewEQROContractorSummary,
} from '../SummarySectionFields'
import { GenericErrorPage } from '../../../pages/Errors/GenericErrorPage'
import { getCurrentRevForZipLink } from './ContractDetailsSummarySection'

export type EQROContractDetailsSummarySection = {
    contract: Contract | UnlockedContract
    contractRev?: ContractRevision
    editNavigateTo?: string
    onDocumentError?: (error: true) => void
    explainMissingData?: boolean
}

export const EQROContractDetailsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo, // this is the edit link for the section. When this prop exists, summary section is loaded in edit mode
    onDocumentError,
    explainMissingData,
}: EQROContractDetailsSummarySection): React.ReactElement => {
    // Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    const { loggedInUser } = useAuth()
    const { revisionVersion } = useParams()
    const isCMSUser = hasCMSUserPermissions(loggedInUser)
    const isSubmittedOrCMSUser =
        contract.status === 'SUBMITTED' ||
        contract.status === 'RESUBMITTED' ||
        isCMSUser
    const isEditing = !isSubmittedOrCMSUser && editNavigateTo !== undefined
    const contractOrRev = contractRev ? contractRev : contract
    const isInitialSubmission = contract.packageSubmissions.length === 1
    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isEditing
    )

    if (!contractFormData) return <GenericErrorPage />

    const contractSupportingDocuments = contractFormData?.supportingDocuments
    const contractDocs = contractFormData?.contractDocuments
    const contractDocumentCount =
        contractSupportingDocuments &&
        contractDocs &&
        contractFormData.supportingDocuments.length +
            contractFormData.contractDocuments.length

    const currentRevision = getCurrentRevForZipLink(
        contract,
        isCMSUser,
        contractRev
    )
    const documentZipPackage = currentRevision?.documentZipPackages
        ? currentRevision.documentZipPackages
        : undefined
    // Calculate last submitted data for document upload tables
    const lastSubmittedIndex = getIndexFromRevisionVersion(
        contract,
        Number(revisionVersion)
    )
    const lastSubmittedDate = isPreviousSubmission
        ? getPackageSubmissionAtIndex(contract, lastSubmittedIndex)?.submitInfo
              .updatedAt
        : (getLastContractSubmission(contract)?.submitInfo.updatedAt ?? null)

    return (
        <SectionCard
            id="contractDetailsSection"
            className={styles.summarySection}
        >
            <SectionHeader
                header="Contract details"
                editNavigateTo={editNavigateTo}
                hideBorderTop
                fontSize="38px"
            />
            <dl>
                <MultiColumnGrid columns={2}>
                    <ContractEffectiveDateSummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                    <NewEQROContractorSummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                </MultiColumnGrid>
                <EQROModifiedProvisionSummary
                    contractID={contract.id}
                    contractFormData={contractFormData}
                    explainMissingData={explainMissingData}
                />
            </dl>
            <DocumentHeader
                type={'CONTRACT'}
                documentZipPackages={documentZipPackage}
                documentCount={contractDocumentCount}
                onDocumentError={onDocumentError}
                renderZipLink={
                    !!(
                        isSubmittedOrCMSUser &&
                        !isPreviousSubmission &&
                        !editNavigateTo
                    )
                }
            />
            {contractDocs && (
                <UploadedDocumentsTable
                    documents={contractFormData.contractDocuments}
                    previousSubmissionDate={
                        isInitialSubmission && isCMSUser
                            ? undefined
                            : lastSubmittedDate
                    }
                    isInitialSubmission={isInitialSubmission}
                    caption="Contract"
                    documentCategory="Contract"
                    hideDynamicFeedback={isSubmittedOrCMSUser}
                />
            )}
            {contractSupportingDocuments && (
                <UploadedDocumentsTable
                    documents={contractSupportingDocuments}
                    previousSubmissionDate={
                        isInitialSubmission && isCMSUser
                            ? undefined
                            : lastSubmittedDate
                    }
                    caption="Contract supporting documents"
                    documentCategory="Contract-supporting"
                    isSupportingDocuments
                    isInitialSubmission={isInitialSubmission}
                    hideDynamicFeedback={isSubmittedOrCMSUser}
                />
            )}
        </SectionCard>
    )
}

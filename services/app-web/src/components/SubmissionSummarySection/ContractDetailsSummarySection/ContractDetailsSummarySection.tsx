import React from 'react'
import {
    Contract,
    ContractRevision,
    UnlockedContract,
} from '../../../gen/gqlClient'
import { useParams } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { SectionHeader } from '../../SectionHeader'
import { UploadedDocumentsTable } from '..'
import { MultiColumnGrid } from '../../MultiColumnGrid'
import { SectionCard } from '../../SectionCard'
import { DocumentHeader } from '../../DocumentHeader/DocumentHeader'
import { usePreviousSubmission } from '../../../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { featureFlags } from '@mc-review/common-code'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import {
    getIndexFromRevisionVersion,
    getLastContractSubmission,
    getPackageSubmissionAtIndex,
    getVisibleLatestContractFormData,
    isContractWithProvisions,
} from '@mc-review/submissions'
import styles from '../SubmissionSummarySection.module.scss'
import {
    ContractEffectiveDateSummary,
    ContractExecutionSummary,
    DsnpSummary,
    FederalAuthoritySummary,
    ManagedCareEntitySummary,
    ModifiedProvisionSummary,
    StatutoryRegulatoryAttestationSummary,
    UnmodifiedProvisionSummary,
} from '../SummarySectionFields'
import { GenericErrorPage } from '../../../pages/Errors/GenericErrorPage'

export type ContractDetailsSummarySectionProps = {
    contract: Contract | UnlockedContract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isStateUser: boolean
    onDocumentError?: (error: true) => void
    explainMissingData?: boolean
}

// Get the zip download URL from the pre-generated zip packages
export const getCurrentRevForZipLink = (
    contract: Contract | UnlockedContract,
    isCMSUser: boolean,
    contractRev: ContractRevision | undefined
): ContractRevision | undefined => {
    const status = contract.status
    switch (true) {
        case !!contractRev:
            return contractRev
        case isCMSUser && status === 'UNLOCKED':
            return contract.packageSubmissions[0]?.contractRevision
        case !!contract.draftRevision:
            return contract.draftRevision
        default:
            return contract.packageSubmissions[0]?.contractRevision
    }
}

export const ContractDetailsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo, // this is the edit link for the section. When this prop exists, summary section is loaded in edit mode
    onDocumentError,
    explainMissingData,
}: ContractDetailsSummarySectionProps): React.ReactElement => {
    // Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    const ldClient = useLDClient()
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

    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )
    const contractDsnp = ldClient?.variation(
        featureFlags.DSNP.flag,
        featureFlags.DSNP.defaultValue
    )

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
                {contract438Attestation && (
                    <StatutoryRegulatoryAttestationSummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                )}
                <MultiColumnGrid columns={2}>
                    <ContractExecutionSummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                    <ContractEffectiveDateSummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                    <ManagedCareEntitySummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                    <FederalAuthoritySummary
                        contractFormData={contractFormData}
                        explainMissingData={explainMissingData}
                    />
                </MultiColumnGrid>
                {contractDsnp && (
                    <MultiColumnGrid columns={1}>
                        <DsnpSummary
                            contractFormData={contractFormData}
                            explainMissingData={explainMissingData}
                        />
                    </MultiColumnGrid>
                )}
                {isContractWithProvisions(contract) && (
                    <MultiColumnGrid columns={2}>
                        <ModifiedProvisionSummary
                            contract={contract}
                            isEditing={isEditing}
                            explainMissingData={explainMissingData}
                        />

                        <UnmodifiedProvisionSummary
                            contract={contract}
                            isEditing={isEditing}
                            explainMissingData={explainMissingData}
                        />
                    </MultiColumnGrid>
                )}
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

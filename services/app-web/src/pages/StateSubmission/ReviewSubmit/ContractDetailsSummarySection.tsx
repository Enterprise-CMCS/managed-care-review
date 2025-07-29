import React, { useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import {
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
} from '@mc-review/hpp'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '@mc-review/dates'
import { MultiColumnGrid } from '../../../components/MultiColumnGrid'
import { DownloadButton } from '../../../components/DownloadButton'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../../SubmissionSummary/SubmissionSummary.module.scss'
import { useAuth } from '../../../contexts/AuthContext'

import {
    sortModifiedProvisions,
    isMissingProvisions,
    getProvisionDictionary,
} from '@mc-review/common-code'
import { DataDetailCheckboxList } from '../../../components/DataDetail/DataDetailCheckboxList'
import {
    isBaseContract,
    isCHIPOnly,
    isContractWithProvisions,
} from '@mc-review/common-code'
import {
    federalAuthorityKeysForCHIP,
    CHIPFederalAuthority,
} from '@mc-review/hpp'
import { recordJSException } from '@mc-review/otel'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../../components/DocumentWarning'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { Grid } from '@trussworks/react-uswds'
import {
    booleanAsYesNoFormValue,
    booleanAsYesNoUserValue,
} from '../../../components/Form/FieldYesNo'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationQuestion,
} from '@mc-review/constants'
import { SectionCard } from '../../../components/SectionCard'
import { Contract, ContractRevision } from '../../../gen/gqlClient'
import { useParams } from 'react-router-dom'
import {
    getIndexFromRevisionVersion,
    getLastContractSubmission,
    getPackageSubmissionAtIndex,
    getVisibleLatestContractFormData,
} from '@mc-review/helpers'
import { hasCMSUserPermissions } from '@mc-review/helpers'

export type ContractDetailsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    editNavigateTo?: string
    isCMSUser?: boolean
    isStateUser: boolean
    submissionName: string
    onDocumentError?: (error: true) => void
    explainMissingData?: boolean
}

function renderDownloadButton(zippedFilesURL: string | undefined | Error) {
    if (zippedFilesURL instanceof Error) {
        return (
            <InlineDocumentWarning message="Contract document download is unavailable" />
        )
    }
    return (
        <DownloadButton
            text="Download all contract documents"
            zippedFilesURL={zippedFilesURL}
        />
    )
}

export const ContractDetailsSummarySection = ({
    contract,
    contractRev,
    editNavigateTo, // this is the edit link for the section. When this prop exists, summary section is loaded in edit mode
    submissionName,
    onDocumentError,
    explainMissingData,
}: ContractDetailsSummarySectionProps): React.ReactElement => {
    // Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    // Get the zip file for the contract
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)
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
    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )
    const contractDsnp = ldClient?.variation(
        featureFlags.DSNP.flag,
        featureFlags.DSNP.defaultValue
    )
    const dsnpTriggers = [
        'STATE_PLAN',
        'WAIVER_1915B',
        'WAIVER_1115',
        'VOLUNTARY',
    ]
    const attestationYesNo =
        contractFormData?.statutoryRegulatoryAttestation != null &&
        booleanAsYesNoFormValue(contractFormData.statutoryRegulatoryAttestation)

    const contractSupportingDocuments = contractFormData?.supportingDocuments
    const applicableFederalAuthorities = isCHIPOnly(contract)
        ? contractFormData?.federalAuthorities.filter((authority) =>
              federalAuthorityKeysForCHIP.includes(
                  authority as CHIPFederalAuthority
              )
          )
        : contractFormData?.federalAuthorities
    const [modifiedProvisions, unmodifiedProvisions] =
        sortModifiedProvisions(contract)
    const provisionsAreInvalid = isMissingProvisions(contract) && isEditing
    const dsnpNotProvided =
        contractFormData?.dsnpContract === null ||
        contractFormData?.dsnpContract === undefined
    const dsnpIsRequired =
        contractFormData?.federalAuthorities?.some((authority) =>
            dsnpTriggers?.includes(authority)
        ) && dsnpNotProvided
    const dsnpUserValue =
        contractFormData?.dsnpContract === null
            ? undefined
            : contractFormData?.dsnpContract
    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous contract or draft
        if (!isSubmittedOrCMSUser || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs =
                contractSupportingDocuments &&
                contractFormData?.contractDocuments
                    .concat(contractSupportingDocuments)
                    .map((doc) => {
                        const key = getKey(doc.s3URL)
                        if (!key) return ''
                        return key
                    })
                    .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL =
                keysFromDocs &&
                (await getBulkDlURL(
                    keysFromDocs,
                    submissionName + '-contract-details.zip',
                    'HEALTH_PLAN_DOCS'
                ))
            if (zippedURL instanceof Error) {
                const msg = `ERROR: getBulkDlURL failed to generate contract document URL. ID: ${contract.id} Message: ${zippedURL}`
                console.info(msg)

                if (onDocumentError) {
                    onDocumentError(true)
                }

                recordJSException(msg)
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [
        getKey,
        getBulkDlURL,
        contract,
        contractSupportingDocuments,
        submissionName,
        isPreviousSubmission,
    ])
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
            >
                {isSubmittedOrCMSUser &&
                    !isPreviousSubmission &&
                    renderDownloadButton(zippedFilesURL)}
            </SectionHeader>
            <dl>
                {contract438Attestation && (
                    <Grid row gap className={styles.singleColumnGrid}>
                        <Grid
                            tablet={{ col: 12 }}
                            key="statutoryRegulatoryAttestation"
                        >
                            {attestationYesNo !== false &&
                                attestationYesNo !== undefined && (
                                    <DataDetail
                                        id="statutoryRegulatoryAttestation"
                                        label={
                                            StatutoryRegulatoryAttestationQuestion
                                        }
                                        explainMissingData={explainMissingData}
                                        children={
                                            StatutoryRegulatoryAttestation[
                                                attestationYesNo
                                            ]
                                        }
                                    />
                                )}
                        </Grid>
                        {attestationYesNo === 'NO' && (
                            <Grid
                                tablet={{ col: 12 }}
                                key="statutoryRegulatoryAttestationDescription"
                            >
                                <DataDetail
                                    id="statutoryRegulatoryAttestationDescription"
                                    label="Non-compliance description"
                                    explainMissingData={explainMissingData}
                                    children={
                                        contractFormData?.statutoryRegulatoryAttestationDescription
                                    }
                                />
                            </Grid>
                        )}
                    </Grid>
                )}
                <MultiColumnGrid columns={2}>
                    <DataDetail
                        id="contractExecutionStatus"
                        label="Contract status"
                        explainMissingData={explainMissingData}
                        children={
                            contractFormData?.contractExecutionStatus
                                ? ContractExecutionStatusRecord[
                                      contractFormData?.contractExecutionStatus
                                  ]
                                : undefined
                        }
                    />
                    <DataDetail
                        id="contractEffectiveDates"
                        label={
                            contractFormData?.contractType === 'AMENDMENT'
                                ? 'Contract amendment effective dates'
                                : 'Contract effective dates'
                        }
                        explainMissingData={explainMissingData}
                        children={
                            contractFormData?.contractDateStart &&
                            contractFormData?.contractDateEnd
                                ? `${formatCalendarDate(
                                      contractFormData?.contractDateStart,
                                      'UTC'
                                  )} to ${formatCalendarDate(
                                      contractFormData?.contractDateEnd,
                                      'UTC'
                                  )}`
                                : undefined
                        }
                    />
                    <DataDetail
                        id="managedCareEntities"
                        label="Managed care entities"
                        children={
                            contractFormData?.managedCareEntities && (
                                <DataDetailCheckboxList
                                    list={contractFormData?.managedCareEntities}
                                    dict={ManagedCareEntityRecord}
                                    // if showing error for missing data, then we do NOT display empty list
                                    displayEmptyList={!explainMissingData}
                                />
                            )
                        }
                    />
                    <DataDetail
                        id="federalAuthorities"
                        label="Active federal operating authority"
                        children={
                            applicableFederalAuthorities && (
                                <DataDetailCheckboxList
                                    list={applicableFederalAuthorities}
                                    dict={FederalAuthorityRecord}
                                    // if error for missing data, then we do NOT display empty list
                                    displayEmptyList={!explainMissingData}
                                />
                            )
                        }
                    />
                </MultiColumnGrid>
                {contractDsnp && (
                    <MultiColumnGrid columns={1}>
                        <DataDetail
                            id="dsnp"
                            label="Is this contract associated with a Dual-Eligible Special Needs Plan (D-SNP) that covers Medicaid benefits?"
                            explainMissingData={
                                dsnpIsRequired && explainMissingData
                            }
                            children={booleanAsYesNoUserValue(dsnpUserValue)}
                        />
                    </MultiColumnGrid>
                )}
                {isContractWithProvisions(contract) && (
                    <MultiColumnGrid columns={2}>
                        <DataDetail
                            id="modifiedProvisions"
                            label={
                                isBaseContract(contract)
                                    ? 'This contract action includes provisions related to the following'
                                    : 'This contract action includes new or modified provisions related to the following'
                            }
                            explainMissingData={
                                provisionsAreInvalid && explainMissingData
                            }
                        >
                            {provisionsAreInvalid ? null : (
                                <DataDetailCheckboxList
                                    list={modifiedProvisions}
                                    dict={getProvisionDictionary(contract)}
                                    displayEmptyList
                                />
                            )}
                        </DataDetail>

                        <DataDetail
                            id="unmodifiedProvisions"
                            label={
                                isBaseContract(contract)
                                    ? 'This contract action does NOT include provisions related to the following'
                                    : 'This contract action does NOT include new or modified provisions related to the following'
                            }
                            explainMissingData={
                                provisionsAreInvalid && explainMissingData
                            }
                        >
                            {provisionsAreInvalid ? null : (
                                <DataDetailCheckboxList
                                    list={unmodifiedProvisions}
                                    dict={getProvisionDictionary(contract)}
                                    displayEmptyList
                                />
                            )}
                        </DataDetail>
                    </MultiColumnGrid>
                )}
            </dl>
            {contractFormData?.contractDocuments && (
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

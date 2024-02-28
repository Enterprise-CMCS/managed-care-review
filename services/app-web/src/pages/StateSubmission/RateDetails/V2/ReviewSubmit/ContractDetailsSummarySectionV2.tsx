import React, { useState } from 'react'
import { DataDetail } from '../../../../../components/DataDetail'
import { SectionHeader } from '../../../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../../../components/SubmissionSummarySection'
import {
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
} from '../../../../../constants/index'
import { useS3 } from '../../../../../contexts/S3Context'
import { formatCalendarDate } from '../../../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../../../../components/DoubleColumnGrid'
import { DownloadButton } from '../../../../../components/DownloadButton'
import { usePreviousSubmission } from '../../../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    sortModifiedProvisions,
    isMissingProvisions,
    getProvisionDictionary,
} from '../../../../../common-code/ContractTypeProvisions'
import { DataDetailCheckboxList } from '../../../../../components/DataDetail/DataDetailCheckboxList'
import {
    isBaseContract,
    isCHIPOnly,
    isContractWithProvisions,
    isSubmitted,
} from '../../../../../common-code/ContractType'
import {
    federalAuthorityKeysForCHIP,
    CHIPFederalAuthority,
} from '../../../../../common-code/healthPlanFormDataType'
import { DocumentDateLookupTableType } from '../../../../../documentHelpers/makeDocumentDateLookupTable'
import { recordJSException } from '../../../../../otelHelpers'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../../../../components/DocumentWarning'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../../../common-code/featureFlags'
import { Grid } from '@trussworks/react-uswds'
import { booleanAsYesNoFormValue } from '../../../../../components/Form/FieldYesNo'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationQuestion,
} from '../../../../../constants/statutoryRegulatoryAttestation'
import { SectionCard } from '../../../../../components/SectionCard'
import { Contract } from '../../../../../gen/gqlClient'

export type ContractDetailsSummarySectionV2Props = {
    contract: Contract
    editNavigateTo?: string
    documentDateLookupTable: DocumentDateLookupTableType
    isCMSUser?: boolean
    submissionName: string
    onDocumentError?: (error: true) => void
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

export const ContractDetailsSummarySectionV2 = ({
    contract,
    editNavigateTo, // this is the edit link for the section. When this prop exists, summary section is loaded in edit mode
    documentDateLookupTable,
    submissionName,
    onDocumentError,
}: ContractDetailsSummarySectionV2Props): React.ReactElement => {
    // Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    // Get the zip file for the contract
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)
    const ldClient = useLDClient()

    const contractFormData = contract.draftRevision?.formData || contract.packageSubmissions[0].contractRevision.formData
    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )

    const attestationYesNo = contractFormData.statutoryRegulatoryAttestation !== null && booleanAsYesNoFormValue(
        contractFormData.statutoryRegulatoryAttestation
    )

    const contractSupportingDocuments = contractFormData?.supportingDocuments
    const isEditing = !isSubmitted(contract) && editNavigateTo !== undefined
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

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous contract or draft
        if (!isSubmitted(contract) || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs = contractFormData?.contractDocuments
                .concat(contractSupportingDocuments)
                .map((doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key) return ''
                    return key
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                keysFromDocs,
                submissionName + '-contract-details.zip',
                'HEALTH_PLAN_DOCS'
            )
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

    return (
        <SectionCard
            id="contractDetailsSection"
            className={styles.summarySection}
        >
            <SectionHeader
                header="Contract details"
                editNavigateTo={editNavigateTo}
            >
                {isSubmitted(contract) &&
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
                            <DataDetail
                                id="statutoryRegulatoryAttestation"
                                label={StatutoryRegulatoryAttestationQuestion}
                                explainMissingData={!isSubmitted(contract)}
                                children={
                                    attestationYesNo !== undefined && typeof attestationYesNo === "string" &&
                                    StatutoryRegulatoryAttestation[
                                        attestationYesNo
                                    ]
                                }
                            />
                        </Grid>
                        {attestationYesNo === 'NO' && (
                            <Grid
                                tablet={{ col: 12 }}
                                key="statutoryRegulatoryAttestationDescription"
                            >
                                <DataDetail
                                    id="statutoryRegulatoryAttestationDescription"
                                    label="Non-compliance description"
                                    explainMissingData={!isSubmitted}
                                    children={
                                        contractFormData.statutoryRegulatoryAttestationDescription
                                    }
                                />
                            </Grid>
                        )}
                    </Grid>
                )}
                <DoubleColumnGrid>
                    <DataDetail
                        id="contractExecutionStatus"
                        label="Contract status"
                        explainMissingData={!isSubmitted(contract)}
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
                        explainMissingData={!isSubmitted(contract)}
                        children={
                            contractFormData?.contractDateStart &&
                            contractFormData?.contractDateEnd
                                ? `${formatCalendarDate(
                                      contractFormData?.contractDateStart
                                  )} to ${formatCalendarDate(
                                      contractFormData?.contractDateEnd
                                  )}`
                                : undefined
                        }
                    />
                    <DataDetail
                        id="managedCareEntities"
                        label="Managed care entities"
                        explainMissingData={!isSubmitted(contract)}
                        children={contractFormData?.managedCareEntities &&
                            <DataDetailCheckboxList
                                list={contractFormData?.managedCareEntities}
                                dict={ManagedCareEntityRecord}
                            />
                        }
                    />
                    <DataDetail
                        id="federalAuthorities"
                        label="Active federal operating authority"
                        explainMissingData={!isSubmitted(contract)}
                        children={applicableFederalAuthorities &&
                            <DataDetailCheckboxList
                                list={applicableFederalAuthorities}
                                dict={FederalAuthorityRecord}
                            />
                        }
                    />
                </DoubleColumnGrid>
                {isContractWithProvisions(contract) && (
                    <DoubleColumnGrid>
                        <DataDetail
                            id="modifiedProvisions"
                            label={
                                isBaseContract(contract)
                                    ? 'This contract action includes provisions related to the following'
                                    : 'This contract action includes new or modified provisions related to the following'
                            }
                            explainMissingData={
                                provisionsAreInvalid && !isSubmitted(contract)
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
                                provisionsAreInvalid && !isSubmitted(contract)
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
                    </DoubleColumnGrid>
                )}
            </dl>
            {contractFormData?.contractDocuments && (
                <UploadedDocumentsTable
                documents={contractFormData.contractDocuments}
                documentDateLookupTable={documentDateLookupTable}
                caption="Contract"
                documentCategory="Contract"
                isEditing={isEditing}
            />
            )}
            {contractSupportingDocuments && (
                <UploadedDocumentsTable
                    documents={contractSupportingDocuments}
                    documentDateLookupTable={documentDateLookupTable}
                    caption="Contract supporting documents"
                    documentCategory="Contract-supporting"
                    isSupportingDocuments
                    isEditing={isEditing}
                />
            )}
        </SectionCard>
    )
}

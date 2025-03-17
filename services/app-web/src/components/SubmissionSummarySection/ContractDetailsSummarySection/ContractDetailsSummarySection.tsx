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
import { MultiColumnGrid } from '../../MultiColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    sortModifiedProvisions,
    isMissingProvisions,
    getProvisionDictionary,
} from '@mc-review/hpp'
import { DataDetailCheckboxList } from '../../DataDetail/DataDetailCheckboxList'
import {
    isBaseContract,
    isCHIPOnly,
    isContractWithProvisions,
    isSubmitted,
} from '@mc-review/hpp'
import {
    HealthPlanFormDataType,
    federalAuthorityKeysForCHIP,
    CHIPFederalAuthority,
} from '@mc-review/hpp'
import { DocumentDateLookupTableType } from '@mc-review/helpers'
import { recordJSException } from '@mc-review/otel'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../DocumentWarning'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { Grid } from '@trussworks/react-uswds'
import { booleanAsYesNoFormValue } from '../../Form/FieldYesNo'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationQuestion,
} from '@mc-review/constants'
import { SectionCard } from '../../SectionCard'
import { convertFromSubmissionDocumentsToGenericDocuments } from '../UploadedDocumentsTable/UploadedDocumentsTable'

export type ContractDetailsSummarySectionProps = {
    submission: HealthPlanFormDataType
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

export const ContractDetailsSummarySection = ({
    submission,
    editNavigateTo, // this is the edit link for the section. When this prop exists, summary section is loaded in edit mode
    documentDateLookupTable,
    submissionName,
    onDocumentError,
}: ContractDetailsSummarySectionProps): React.ReactElement => {
    // Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    // Get the zip file for the contract
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)
    const ldClient = useLDClient()

    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )

    const attestationYesNo = booleanAsYesNoFormValue(
        submission.statutoryRegulatoryAttestation
    )

    const contractSupportingDocuments = submission.documents
    const isEditing = !isSubmitted(submission) && editNavigateTo !== undefined
    const applicableFederalAuthorities = isCHIPOnly(submission)
        ? submission.federalAuthorities.filter((authority) =>
              federalAuthorityKeysForCHIP.includes(
                  authority as CHIPFederalAuthority
              )
          )
        : submission.federalAuthorities
    const [modifiedProvisions, unmodifiedProvisions] =
        sortModifiedProvisions(submission)
    const provisionsAreInvalid = isMissingProvisions(submission) && isEditing

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous submission or draft
        if (!isSubmitted(submission) || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const keysFromDocs = submission.contractDocuments
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
                const msg = `ERROR: getBulkDlURL failed to generate contract document URL. ID: ${submission.id} Message: ${zippedURL}`
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
        submission,
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
                {isSubmitted(submission) &&
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
                                explainMissingData={!isSubmitted(submission)}
                                children={
                                    attestationYesNo !== undefined &&
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
                                        submission.statutoryRegulatoryAttestationDescription
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
                        explainMissingData={!isSubmitted(submission)}
                        children={
                            submission.contractExecutionStatus
                                ? ContractExecutionStatusRecord[
                                      submission.contractExecutionStatus
                                  ]
                                : undefined
                        }
                    />
                    <DataDetail
                        id="contractEffectiveDates"
                        label={
                            submission.contractType === 'AMENDMENT'
                                ? 'Contract amendment effective dates'
                                : 'Contract effective dates'
                        }
                        explainMissingData={!isSubmitted(submission)}
                        children={
                            submission.contractDateStart &&
                            submission.contractDateEnd
                                ? `${formatCalendarDate(
                                      submission.contractDateStart,
                                      'UTC'
                                  )} to ${formatCalendarDate(
                                      submission.contractDateEnd,
                                      'UTC'
                                  )}`
                                : undefined
                        }
                    />
                    <DataDetail
                        id="managedCareEntities"
                        label="Managed care entities"
                        explainMissingData={!isSubmitted(submission)}
                        children={
                            <DataDetailCheckboxList
                                list={submission.managedCareEntities}
                                dict={ManagedCareEntityRecord}
                            />
                        }
                    />
                    <DataDetail
                        id="federalAuthorities"
                        label="Active federal operating authority"
                        explainMissingData={!isSubmitted(submission)}
                        children={
                            <DataDetailCheckboxList
                                list={applicableFederalAuthorities}
                                dict={FederalAuthorityRecord}
                            />
                        }
                    />
                </MultiColumnGrid>
                {isContractWithProvisions(submission) && (
                    <MultiColumnGrid columns={2}>
                        <DataDetail
                            id="modifiedProvisions"
                            label={
                                isBaseContract(submission)
                                    ? 'This contract action includes provisions related to the following'
                                    : 'This contract action includes new or modified provisions related to the following'
                            }
                            explainMissingData={
                                provisionsAreInvalid && !isSubmitted(submission)
                            }
                        >
                            {provisionsAreInvalid ? null : (
                                <DataDetailCheckboxList
                                    list={modifiedProvisions}
                                    dict={getProvisionDictionary(submission)}
                                    displayEmptyList
                                />
                            )}
                        </DataDetail>

                        <DataDetail
                            id="unmodifiedProvisions"
                            label={
                                isBaseContract(submission)
                                    ? 'This contract action does NOT include provisions related to the following'
                                    : 'This contract action does NOT include new or modified provisions related to the following'
                            }
                            explainMissingData={
                                provisionsAreInvalid && !isSubmitted(submission)
                            }
                        >
                            {provisionsAreInvalid ? null : (
                                <DataDetailCheckboxList
                                    list={unmodifiedProvisions}
                                    dict={getProvisionDictionary(submission)}
                                    displayEmptyList
                                />
                            )}
                        </DataDetail>
                    </MultiColumnGrid>
                )}
            </dl>
            <UploadedDocumentsTable
                documents={convertFromSubmissionDocumentsToGenericDocuments(
                    submission.contractDocuments,
                    documentDateLookupTable
                )}
                previousSubmissionDate={
                    documentDateLookupTable.previousSubmissionDate
                        ? new Date(
                              documentDateLookupTable.previousSubmissionDate
                          )
                        : null
                }
                caption="Contract"
                documentCategory="Contract"
                hideDynamicFeedback={!isEditing}
            />
            <UploadedDocumentsTable
                documents={convertFromSubmissionDocumentsToGenericDocuments(
                    contractSupportingDocuments,
                    documentDateLookupTable
                )}
                previousSubmissionDate={
                    documentDateLookupTable.previousSubmissionDate
                        ? new Date(
                              documentDateLookupTable.previousSubmissionDate
                          )
                        : null
                }
                caption="Contract supporting documents"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                hideDynamicFeedback={!isEditing}
            />
        </SectionCard>
    )
}

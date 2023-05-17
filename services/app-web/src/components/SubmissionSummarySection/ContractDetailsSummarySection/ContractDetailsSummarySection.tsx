import { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { DocumentDateLookupTable } from '../../../pages/SubmissionSummary/SubmissionSummary'
import {
    ModifiedProvisionsCHIPRecord,
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    ModifiedProvisionsAmendmentRecord,
} from '../../../constants/index'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    allowedProvisionKeysForCHIP,
    federalAuthorityKeysForCHIP,
    HealthPlanFormDataType,
    generalizedProvisionKeys,
    sortModifiedProvisions
} from '../../../common-code/healthPlanFormDataType'
import { DataDetailCheckboxList } from '../../DataDetail/DataDetailCheckboxList'

export type ContractDetailsSummarySectionProps = {
    submission: HealthPlanFormDataType
    navigateTo?: string
    documentDateLookupTable?: DocumentDateLookupTable
    isCMSUser?: boolean
    submissionName: string
}

export const ContractDetailsSummarySection = ({
    submission,
    navigateTo,
    documentDateLookupTable,
    isCMSUser,
    submissionName,
}: ContractDetailsSummarySectionProps): React.ReactElement => {
    //Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    // Get the zip file for the contract
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<string>('')
    const contractSupportingDocuments = submission.documents.filter((doc) =>
        doc.documentCategories.includes('CONTRACT_RELATED' as const)
    )
    const isSubmitted = submission.status === 'SUBMITTED'
    const isEditing = !isSubmitted && navigateTo !== undefined
    const isCHIPOnly = submission.populationCovered === 'CHIP'
    const applicableFederalAuthorities = isCHIPOnly
        ? submission.federalAuthorities.filter((authority) =>
              federalAuthorityKeysForCHIP.includes(authority)
          )
        : submission.federalAuthorities

    useEffect(() => {
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
                console.info('ERROR: TODO: DISPLAY AN ERROR MESSAGE')
                return
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
    ])

    const [modifiedProvisions, unmodifiedProvisions] = sortModifiedProvisions(
        submission
    )

    // Ensure that missing field validations for modified provisions works properly even though required provisions list shifts depending on submission
    const requiredProvisions = isCHIPOnly
        ? allowedProvisionKeysForCHIP
        : generalizedProvisionKeys
    const amendmentProvisionsUnanswered =
        modifiedProvisions.length + unmodifiedProvisions.length <
        requiredProvisions.length

    return (
        <section id="contractDetailsSection" className={styles.summarySection}>
            <SectionHeader header="Contract details" navigateTo={navigateTo}>
                {isSubmitted && !isPreviousSubmission && (
                    <DownloadButton
                        text="Download all contract documents"
                        zippedFilesURL={zippedFilesURL}
                    />
                )}
            </SectionHeader>
            <dl>
                <DoubleColumnGrid>
                    <DataDetail
                        id="contractExecutionStatus"
                        label="Contract status"
                        explainMissingData={!isSubmitted}
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
                        explainMissingData={!isSubmitted}
                        children={
                            submission.contractDateStart &&
                            submission.contractDateEnd
                                ? `${formatCalendarDate(
                                      submission.contractDateStart
                                  )} to ${formatCalendarDate(
                                      submission.contractDateEnd
                                  )}`
                                : undefined
                        }
                    />
                    <DataDetail
                        id="managedCareEntities"
                        label="Managed care entities"
                        explainMissingData={!isSubmitted}
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
                        explainMissingData={!isSubmitted}
                        children={
                            <DataDetailCheckboxList
                                list={applicableFederalAuthorities}
                                dict={FederalAuthorityRecord}
                            />
                        }
                    />
                </DoubleColumnGrid>
                {submission.contractType === 'AMENDMENT' && (
                    <DoubleColumnGrid>
                        <DataDetail
                            id="modifiedProvisions"
                            label="This contract action includes new or modified provisions related to the following"
                            explainMissingData={
                                amendmentProvisionsUnanswered && !isSubmitted
                            }
                        >
                            {amendmentProvisionsUnanswered ? null : (
                                <DataDetailCheckboxList
                                    list={modifiedProvisions}
                                    dict={
                                        isCHIPOnly
                                            ? ModifiedProvisionsCHIPRecord
                                            : ModifiedProvisionsAmendmentRecord
                                    }
                                    displayEmptyList
                                />
                            )}
                        </DataDetail>

                        <DataDetail
                            id="unmodifiedProvisions"
                            label="This contract action does NOT include new or modified provisions related to the following"
                            explainMissingData={
                                amendmentProvisionsUnanswered && !isSubmitted
                            }
                        >
                            {amendmentProvisionsUnanswered ? null : (
                                <DataDetailCheckboxList
                                    list={unmodifiedProvisions}
                                    dict={
                                        isCHIPOnly
                                            ? ModifiedProvisionsCHIPRecord
                                            : ModifiedProvisionsAmendmentRecord
                                    }
                                    displayEmptyList
                                />
                            )}
                        </DataDetail>
                    </DoubleColumnGrid>
                )}
            </dl>
            <UploadedDocumentsTable
                documents={submission.contractDocuments}
                documentDateLookupTable={documentDateLookupTable}
                isCMSUser={isCMSUser}
                caption="Contract"
                documentCategory="Contract"
            />
            <UploadedDocumentsTable
                documents={contractSupportingDocuments}
                documentDateLookupTable={documentDateLookupTable}
                isCMSUser={isCMSUser}
                caption="Contract supporting documents"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                isEditing={isEditing}
            />
        </section>
    )
}

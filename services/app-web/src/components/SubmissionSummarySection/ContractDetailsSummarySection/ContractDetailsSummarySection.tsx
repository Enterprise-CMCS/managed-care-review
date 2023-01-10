import { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { DocumentDateLookupTable } from '../../../pages/SubmissionSummary/SubmissionSummary'
import {
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    ModifiedProvisionsRecord,
} from '../../../constants/healthPlanPackages'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    HealthPlanFormDataType,
    ModifiedProvisions,
} from '../../../common-code/healthPlanFormDataType'

export type ContractDetailsSummarySectionProps = {
    submission: HealthPlanFormDataType
    navigateTo?: string
    documentDateLookupTable?: DocumentDateLookupTable
    isCMSUser?: boolean
    submissionName: string
}

// This function takes a ContractAmendmentInfo and returns two lists of keys sorted by whether they are set true/false
export function sortModifiedProvisions(
    amendmentInfo: ModifiedProvisions | undefined
): [string[], string[]] {
    const modifiedProvisions = []
    const unmodifiedProvisions = []

    if (amendmentInfo) {
        // We type cast this to be the list of keys in the ContractAmendmentInfo
        const provisions = Object.keys(amendmentInfo) as Array<
            keyof ModifiedProvisions
        >

        for (const provisionKey of provisions) {
            const value = amendmentInfo[provisionKey]
            if (value === true) {
                modifiedProvisions.push(provisionKey)
            } else {
                unmodifiedProvisions.push(provisionKey)
            }
        }
    }

    return [modifiedProvisions, unmodifiedProvisions]
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
                submissionName + '-contract-details.zip'
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
        submission.contractAmendmentInfo?.modifiedProvisions
    )

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
                        data={
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
                            submission.contractType === 'BASE'
                                ? 'Contract effective dates'
                                : 'Contract amendment effective dates'
                        }
                        explainMissingData={!isSubmitted}
                        data={
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
                        data={createCheckboxList({
                            list: submission.managedCareEntities,
                            dict: ManagedCareEntityRecord,
                        })}
                    />
                    <DataDetail
                        id="federalAuthorities"
                        label="Active federal operating authority"
                        explainMissingData={!isSubmitted}
                        data={createCheckboxList({
                            list: submission.federalAuthorities,
                            dict: FederalAuthorityRecord,
                        })}
                    />
                </DoubleColumnGrid>
                {submission.contractType === 'AMENDMENT' &&
                    submission.contractAmendmentInfo && (
                        <DoubleColumnGrid>
                            <DataDetail
                                id="modifiedProvisions"
                                label="This contract action includes new or modified provisions related to the following"
                                explainMissingData={!isSubmitted}
                                data={createCheckboxList({
                                    list: modifiedProvisions,
                                    dict: ModifiedProvisionsRecord,
                                })}
                            />

                            <DataDetail
                                id="unmodifiedProvisions"
                                label="This contract action does NOT include new or modified provisions related to the following"
                                explainMissingData={!isSubmitted}
                                data={createCheckboxList({
                                    list: unmodifiedProvisions,
                                    dict: ModifiedProvisionsRecord,
                                })}
                            />
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

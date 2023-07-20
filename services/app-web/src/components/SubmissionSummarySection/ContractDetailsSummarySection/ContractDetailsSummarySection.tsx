import { useEffect, useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import {
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
} from '../../../constants/index'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'
import {
    sortModifiedProvisions,
    isMissingProvisions,
    getProvisionDictionary,
} from '../../../common-code/healthPlanSubmissionHelpers/provisions'
import { DataDetailCheckboxList } from '../../DataDetail/DataDetailCheckboxList'
import {
    isBaseContract,
    isCHIPOnly,
    isContractWithProvisions,
    isSubmitted,
} from '../../../common-code/healthPlanFormDataType/healthPlanFormData'
import {
    HealthPlanFormDataType,
    federalAuthorityKeysForCHIP,
} from '../../../common-code/healthPlanFormDataType'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'

export type ContractDetailsSummarySectionProps = {
    submission: HealthPlanFormDataType
    navigateTo?: string
    documentDateLookupTable: DocumentDateLookupTableType
    isCMSUser?: boolean
    submissionName: string
}

export const ContractDetailsSummarySection = ({
    submission,
    navigateTo, // this is the edit link for the section. When this prop exists, summary section is loaded in edit mode
    documentDateLookupTable,
    isCMSUser,
    submissionName,
}: ContractDetailsSummarySectionProps): React.ReactElement => {
    // Checks if submission is a previous submission
    const isPreviousSubmission = usePreviousSubmission()
    // Get the zip file for the contract
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<string>('')
    const contractSupportingDocuments = submission.documents.filter((doc) =>
        doc.documentCategories.includes('CONTRACT_RELATED' as const)
    )
    const isEditing = !isSubmitted(submission) && navigateTo !== undefined
    const applicableFederalAuthorities = isCHIPOnly(submission)
        ? submission.federalAuthorities.filter((authority) =>
              federalAuthorityKeysForCHIP.includes(authority)
          )
        : submission.federalAuthorities
    const [modifiedProvisions, unmodifiedProvisions] =
        sortModifiedProvisions(submission)
    const provisionsAreInvalid = isMissingProvisions(submission) && isEditing

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
    return (
        <section id="contractDetailsSection" className={styles.summarySection}>
            <SectionHeader header="Contract details" navigateTo={navigateTo}>
                {isSubmitted(submission) && !isPreviousSubmission && (
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
                </DoubleColumnGrid>
                {isContractWithProvisions(submission) && (
                    <DoubleColumnGrid>
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

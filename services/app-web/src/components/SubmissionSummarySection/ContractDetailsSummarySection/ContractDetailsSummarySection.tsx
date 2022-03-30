import { useEffect, useState } from 'react'
import { useRouteMatch } from 'react-router-dom'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import {
    AmendableItemsRecord,
    ContractExecutionStatusRecord,
    ContractTypeRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    RateChangeReasonRecord,
} from '../../../constants/submissions'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../dateHelpers'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DownloadButton } from '../../DownloadButton'
import { RoutesRecord } from '../../../constants/routes'
import styles from '../SubmissionSummarySection.module.scss'

export type ContractDetailsSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

const createCheckboxList = ({
    list,
    dict,
    otherReasons = [],
}: {
    list: string[] // Checkbox field array
    dict: Record<string, string> // A lang constant dictionary like ManagedCareEntityRecord or FederalAuthorityRecord,
    otherReasons?: (string | null)[] // additional "Other" text values
}) => {
    const userFriendlyList = list.map((item) => {
        return dict[item] ? dict[item] : null
    })

    const listToDisplay = otherReasons
        ? userFriendlyList.concat(otherReasons)
        : userFriendlyList

    return (
        <ul>
            {listToDisplay.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    )
}

export const ContractDetailsSummarySection = ({
    submission,
    navigateTo,
}: ContractDetailsSummarySectionProps): React.ReactElement => {
    //Checks if submission is a previous submission
    const { path } = useRouteMatch()
    const isPreviousSubmission = path === RoutesRecord.SUBMISSIONS_REVISION
    // Get the zip file for the contract
    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<string>('')
    const contractSupportingDocuments = submission.documents.filter((doc) =>
        doc.documentCategories.includes('CONTRACT_RELATED' as const)
    )
    const isSubmitted = submission.__typename === 'StateSubmission'
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
                submission.name + '-contract-details.zip'
            )
            if (zippedURL instanceof Error) {
                console.log('ERROR: TODO: DISPLAY AN ERROR MESSAGE')
                return
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [getKey, getBulkDlURL, submission, contractSupportingDocuments])

    // Array of values from a checkbox field is displayed in an unordered list
    const capitationRateChangeReason = (): string | null => {
        const { reason, otherReason } =
            submission?.contractAmendmentInfo?.capitationRatesAmendedInfo || {}
        if (!reason) return null

        return otherReason
            ? `${AmendableItemsRecord['CAPITATION_RATES']} (${otherReason})`
            : `${AmendableItemsRecord['CAPITATION_RATES']} (${RateChangeReasonRecord[reason]})`
    }

    // Capture the "other" fields in Items being amended
    // Including Capitation rates (Other) and Other
    // to pass through to multi checkbox list
    const itemsAmendedOtherList = []

    if (
        submission?.contractAmendmentInfo?.itemsBeingAmended.includes(
            'CAPITATION_RATES'
        ) &&
        capitationRateChangeReason() !== null
    ) {
        itemsAmendedOtherList.push(capitationRateChangeReason())
    }

    if (submission.contractAmendmentInfo?.otherItemBeingAmended) {
        const amendedOtherReason = `Other (${submission.contractAmendmentInfo?.otherItemBeingAmended})`
        itemsAmendedOtherList.push(amendedOtherReason)
    }

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
                        id="contractType"
                        label="Contract action type"
                        data={
                            submission.contractType
                                ? ContractTypeRecord[submission.contractType]
                                : ''
                        }
                    />
                    <DataDetail
                        id="contractExecutionStatus"
                        label="Contract status"
                        data={
                            submission.contractExecutionStatus
                                ? ContractExecutionStatusRecord[
                                      submission.contractExecutionStatus
                                  ]
                                : ''
                        }
                    />
                    <DataDetail
                        id="contractEffectiveDates"
                        label={
                            submission.contractType === 'BASE'
                                ? 'Contract effective dates'
                                : 'Contract amendment effective dates'
                        }
                        data={`${formatCalendarDate(
                            submission.contractDateStart
                        )} to ${formatCalendarDate(
                            submission.contractDateEnd
                        )}`}
                    />
                    <DataDetail
                        id="managedCareEntities"
                        label="Managed care entities"
                        data={createCheckboxList({
                            list: submission.managedCareEntities,
                            dict: ManagedCareEntityRecord,
                        })}
                    />
                    <DataDetail
                        id="federalAuthorities"
                        label="Active federal operating authority"
                        data={createCheckboxList({
                            list: submission.federalAuthorities,
                            dict: FederalAuthorityRecord,
                        })}
                    />
                </DoubleColumnGrid>
                {submission.contractType === 'AMENDMENT' &&
                    submission.contractAmendmentInfo && (
                        <>
                            <DoubleColumnGrid>
                                <DataDetail
                                    id="itemsAmended"
                                    label="Items being amended"
                                    data={createCheckboxList({
                                        list: submission.contractAmendmentInfo.itemsBeingAmended.filter(
                                            (item) =>
                                                item !== 'CAPITATION_RATES' &&
                                                item !== 'OTHER'
                                        ),
                                        dict: AmendableItemsRecord,
                                        otherReasons: itemsAmendedOtherList,
                                    })}
                                />
                                <DataDetail
                                    id="covidRelated"
                                    label="Is this contract action related to the COVID-19 public health emergency"
                                    data={
                                        submission.contractAmendmentInfo
                                            .relatedToCovid19
                                            ? 'Yes'
                                            : 'No'
                                    }
                                />
                            </DoubleColumnGrid>
                            {submission.contractAmendmentInfo
                                .relatedToCovid19 && (
                                <DoubleColumnGrid>
                                    <DataDetail
                                        id="vaccineRelated"
                                        label="Is this related to coverage and reimbursement for vaccine administration?"
                                        data={
                                            submission.contractAmendmentInfo
                                                .relatedToVaccination
                                                ? 'Yes'
                                                : 'No'
                                        }
                                    />
                                </DoubleColumnGrid>
                            )}
                        </>
                    )}
            </dl>
            <UploadedDocumentsTable
                documents={submission.contractDocuments}
                caption="Contract"
                documentCategory="Contract"
            />
            <UploadedDocumentsTable
                documents={contractSupportingDocuments}
                caption="Contract supporting documents"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                isEditing={isEditing}
            />
        </section>
    )
}

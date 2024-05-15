import React, { useState } from 'react'
import { DataDetail } from '../../../../../components/DataDetail'
import { SectionHeader } from '../../../../../components/SectionHeader'
import { useS3 } from '../../../../../contexts/S3Context'
import { formatCalendarDate } from '../../../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../../../../components/DoubleColumnGrid'
import { DownloadButton } from '../../../../../components/DownloadButton'
import { UploadedDocumentsTable } from '../../../../../components/SubmissionSummarySection'
import { usePreviousSubmission } from '../../../../../hooks/usePreviousSubmission'
import styles from '../../../../../components/SubmissionSummarySection/SubmissionSummarySection.module.scss'
import { GenericErrorPage } from '../../../../Errors/GenericErrorPage'

import { recordJSException } from '../../../../../otelHelpers'
import { DataDetailMissingField } from '../../../../../components/DataDetail/DataDetailMissingField'
import { DataDetailContactField } from '../../../../../components/DataDetail/DataDetailContactField/DataDetailContactField'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../../../../components/DocumentWarning'
import { SectionCard } from '../../../../../components/SectionCard'
import {
    Rate,
    Contract,
    ContractRevision,
    Program,
    RateRevision,
    RateFormData,
    HealthPlanPackageStatus,
} from '../../../../../gen/gqlClient'
import {
    getLastContractSubmission,
    getVisibleLatestRateRevisions,
    getVisibleLatestContractFormData,
} from '../../../../../gqlHelpers/contractsAndRates'
import { useAuth } from '../../../../../contexts/AuthContext'
import { ActuaryCommunicationRecord } from '../../../../../constants'

export type RateDetailsSummarySectionV2Props = {
    contract: Contract
    contractRev?: ContractRevision
    rateRevs?: RateRevision[]
    editNavigateTo?: string
    isCMSUser?: boolean
    submissionName: string
    statePrograms: Program[]
    onDocumentError?: (error: true) => void
}

type SharedRateCertDisplay = {
    packageId?: string
    packageName?: string
}
type PackageNameType = string
type PackageNamesLookupType = {
    [id: string]: {
        packageName: PackageNameType
        status: HealthPlanPackageStatus
    }
}

export function renderDownloadButton(
    zippedFilesURL: string | undefined | Error
) {
    if (zippedFilesURL instanceof Error) {
        return (
            <InlineDocumentWarning message="Rate document download is unavailable" />
        )
    }
    return (
        <DownloadButton
            text="Download all rate documents"
            zippedFilesURL={zippedFilesURL}
        />
    )
}

export const RateDetailsSummarySectionV2 = ({
    contract,
    contractRev,
    rateRevs,
    editNavigateTo,
    submissionName,
    statePrograms,
    onDocumentError,
}: RateDetailsSummarySectionV2Props): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const isSubmitted =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
    const isCMSUser = loggedInUser?.role === 'CMS_USER'
    const isSubmittedOrCMSUser = isSubmitted || isCMSUser

    const isEditing = !isSubmittedOrCMSUser && editNavigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()
    const contractOrRev = contractRev ? contractRev : contract

    const contractFormData = getVisibleLatestContractFormData(
        contractOrRev,
        isEditing
    )
    const rates = rateRevs
        ? rateRevs
        : getVisibleLatestRateRevisions(contract, isEditing)
    const lastSubmittedDate =
        getLastContractSubmission(contract)?.submitInfo.updatedAt ?? null

    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)
    const [packageNamesLookup] = React.useState<PackageNamesLookupType | null>(
        null
    )

    // For V2 we only call this function and show deprecated shared rates across packages when the submission for historical data
    // if submission is being edited, don't show this UI
    const refreshPackagesWithSharedRateCert = (
        rateFormData: RateFormData
    ): SharedRateCertDisplay[] | undefined => {
        return rateFormData.packagesWithSharedRateCerts?.map(
            ({ packageId, packageName }) => {
                const refreshedName =
                    packageId &&
                    packageNamesLookup &&
                    packageNamesLookup[packageId]?.packageName

                return {
                    packageId,
                    packageName: refreshedName ?? `${packageName}`,
                }
            }
        )
    }

    const rateCapitationType = (rate: Rate | RateRevision) => {
        const rateFormData = getRateFormData(rate)
        if (!rateFormData) return <GenericErrorPage />
        return rateFormData.rateCapitationType
            ? rateFormData.rateCapitationType === 'RATE_CELL'
                ? 'Certification of capitation rates specific to each rate cell'
                : 'Certification of rate ranges of capitation rates per rate cell'
            : ''
    }

    const ratePrograms = (
        rate: Rate | RateRevision,
        useHistoricPrograms: boolean
    ) => {
        /* if we have rateProgramIDs, use them, otherwise use programIDs */
        let programIDs = [] as string[]
        const rateFormData = getRateFormData(rate)
        if (!rateFormData) return <GenericErrorPage />
        if (useHistoricPrograms) {
            programIDs = rateFormData.deprecatedRateProgramIDs
        } else if (
            rateFormData.rateProgramIDs &&
            rateFormData.rateProgramIDs.length > 0
        ) {
            programIDs = rateFormData.rateProgramIDs
        } else if (
            contractFormData?.programIDs &&
            contractFormData?.programIDs.length > 0
        ) {
            programIDs = contractFormData.programIDs
        }
        return programIDs
            ? statePrograms
                  .filter((p) => programIDs.includes(p.id))
                  .map((p) => p.name)
            : undefined
    }

    const rateCertificationType = (rate: Rate | RateRevision) => {
        const rateFormData = getRateFormData(rate)
        if (!rateFormData) return <GenericErrorPage />
        if (rateFormData.rateType === 'AMENDMENT') {
            return 'Amendment to prior rate certification'
        }
        if (rateFormData.rateType === 'NEW') {
            return 'New rate certification'
        }
    }

    const getRateFormData = (rate: Rate | RateRevision): RateFormData => {
        const isRateRev = 'formData' in rate
        if (!isRateRev) {
            // TODO: make this support an unlocked child rate.
            if (rate.status === 'DRAFT') {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return rate.draftRevision!.formData
            } else {
                return rate.revisions[0]?.formData
            }
        } else {
            return rate.formData
        }
    }

    useDeepCompareEffect(() => {
        // skip getting urls of this if this is a previous submission or draft
        if (!isSubmittedOrCMSUser || isPreviousSubmission) return

        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const submittedRates =
                getLastContractSubmission(contract)?.rateRevisions
            if (submittedRates !== undefined) {
                const keysFromDocs = submittedRates
                    .flatMap((rateInfo) =>
                        rateInfo.formData.rateDocuments.concat(
                            rateInfo.formData.supportingDocuments
                        )
                    )
                    .map((doc) => {
                        const key = getKey(doc.s3URL)
                        if (!key) return ''
                        return key
                    })
                    .filter((key) => key !== '')

                // call the lambda to zip the files and get the url
                const zippedURL = await getBulkDlURL(
                    keysFromDocs,
                    submissionName + '-rate-details.zip',
                    'HEALTH_PLAN_DOCS'
                )
                if (zippedURL instanceof Error) {
                    const msg = `ERROR: getBulkDlURL failed to generate supporting document URL. ID: ${contract.id} Message: ${zippedURL}`
                    console.info(msg)

                    if (onDocumentError) {
                        onDocumentError(true)
                    }

                    recordJSException(msg)
                }

                setZippedFilesURL(zippedURL)
            }
        }

        void fetchZipUrl()
    }, [
        getKey,
        getBulkDlURL,
        contract,
        submissionName,
        isSubmittedOrCMSUser,
        isPreviousSubmission,
    ])

    return (
        <SectionCard id="rateDetails" className={styles.summarySection}>
            <SectionHeader
                header="Rate details"
                editNavigateTo={editNavigateTo}
            >
                {isSubmittedOrCMSUser &&
                    !isPreviousSubmission &&
                    renderDownloadButton(zippedFilesURL)}
            </SectionHeader>
            {rates && rates.length > 0 ? (
                rates.map((rate, rateIndex) => {
                    const rateFormData = getRateFormData(rate)
                    if (!rateFormData) {
                        return <GenericErrorPage />
                    }
                    return (
                        <SectionCard
                            id={`rate-details-${rate.id}`}
                            key={rate.id}
                        >
                            <h3
                                aria-label={`Rate ID: ${rateFormData.rateCertificationName}`}
                                className={styles.rateName}
                            >
                                {rateFormData.rateCertificationName}
                            </h3>
                            <dl>
                                <DoubleColumnGrid>
                                    {rate.formData.deprecatedRateProgramIDs
                                        .length > 0 &&
                                        isSubmitted && (
                                            <DataDetail
                                                id="historicRatePrograms"
                                                label="Programs this rate certification covers"
                                                explainMissingData={
                                                    !isSubmittedOrCMSUser
                                                }
                                                children={ratePrograms(
                                                    rate,
                                                    true
                                                )}
                                            />
                                        )}
                                    {ratePrograms && (
                                        <DataDetail
                                            id="ratePrograms"
                                            label="Rates this rate certification covers"
                                            explainMissingData={
                                                !isSubmittedOrCMSUser
                                            }
                                            children={ratePrograms(rate, false)}
                                        />
                                    )}
                                    <DataDetail
                                        id="rateType"
                                        label="Rate certification type"
                                        explainMissingData={
                                            !isSubmittedOrCMSUser
                                        }
                                        children={rateCertificationType(rate)}
                                    />
                                    <DataDetail
                                        id="ratingPeriod"
                                        label={
                                            rateFormData.rateType ===
                                            'AMENDMENT'
                                                ? 'Rating period of original rate certification'
                                                : 'Rating period'
                                        }
                                        explainMissingData={
                                            !isSubmittedOrCMSUser
                                        }
                                        children={
                                            rateFormData.rateDateStart &&
                                            rateFormData.rateDateEnd ? (
                                                `${formatCalendarDate(
                                                    rateFormData.rateDateStart
                                                )} to ${formatCalendarDate(
                                                    rateFormData.rateDateEnd
                                                )}`
                                            ) : (
                                                <DataDetailMissingField />
                                            )
                                        }
                                    />
                                    <DataDetail
                                        id="dateCertified"
                                        label={
                                            rateFormData.amendmentEffectiveDateStart
                                                ? 'Date certified for rate amendment'
                                                : 'Date certified'
                                        }
                                        explainMissingData={
                                            !isSubmittedOrCMSUser
                                        }
                                        children={formatCalendarDate(
                                            rateFormData.rateDateCertified
                                        )}
                                    />
                                    {rateFormData.amendmentEffectiveDateStart ? (
                                        <DataDetail
                                            id="effectiveRatingPeriod"
                                            label="Rate amendment effective dates"
                                            explainMissingData={
                                                !isSubmittedOrCMSUser
                                            }
                                            children={`${formatCalendarDate(
                                                rateFormData.amendmentEffectiveDateStart
                                            )} to ${formatCalendarDate(
                                                rateFormData.amendmentEffectiveDateEnd
                                            )}`}
                                        />
                                    ) : null}
                                    <DataDetail
                                        id="rateCapitationType"
                                        label="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                                        explainMissingData={
                                            !isSubmittedOrCMSUser
                                        }
                                        children={rateCapitationType(rate)}
                                    />
                                    {rateFormData
                                        .certifyingActuaryContacts[0] && (
                                        <DataDetail
                                            id="certifyingActuary"
                                            label="Certifying actuary"
                                            explainMissingData={
                                                !isSubmittedOrCMSUser
                                            }
                                            children={
                                                <DataDetailContactField
                                                    contact={
                                                        rateFormData
                                                            .certifyingActuaryContacts[0]
                                                    }
                                                />
                                            }
                                        />
                                    )}
                                    {rateFormData.addtlActuaryContacts.map(
                                        (contact, addtlContactIndex) => (
                                            <DataDetail
                                                key={`addtlCertifyingActuary-${addtlContactIndex}`}
                                                id={`addtlCertifyingActuary-${addtlContactIndex}`}
                                                label="Certifying actuary"
                                                explainMissingData={
                                                    !isSubmittedOrCMSUser
                                                }
                                                children={
                                                    <DataDetailContactField
                                                        contact={contact}
                                                    />
                                                }
                                            />
                                        )
                                    )}
                                    <DataDetail
                                        id="communicationPreference"
                                        label="Actuaries’ communication preference"
                                        children={
                                            rateFormData.actuaryCommunicationPreference &&
                                            ActuaryCommunicationRecord[
                                                rateFormData
                                                    .actuaryCommunicationPreference
                                            ]
                                        }
                                        explainMissingData={
                                            !isSubmittedOrCMSUser
                                        }
                                    />
                                </DoubleColumnGrid>
                            </dl>
                            {rateFormData.rateDocuments && (
                                <UploadedDocumentsTable
                                    documents={rateFormData.rateDocuments}
                                    packagesWithSharedRateCerts={
                                        isEditing
                                            ? undefined
                                            : refreshPackagesWithSharedRateCert(
                                                  rateFormData
                                              )
                                    }
                                    multipleDocumentsAllowed={false}
                                    caption="Rate certification"
                                    documentCategory="Rate certification"
                                    previousSubmissionDate={lastSubmittedDate}
                                    hideDynamicFeedback={isSubmittedOrCMSUser}
                                />
                            )}
                            {rateFormData.supportingDocuments && (
                                <UploadedDocumentsTable
                                    documents={rateFormData.supportingDocuments}
                                    previousSubmissionDate={lastSubmittedDate}
                                    packagesWithSharedRateCerts={
                                        isEditing
                                            ? undefined
                                            : refreshPackagesWithSharedRateCert(
                                                  rateFormData
                                              )
                                    }
                                    caption="Rate supporting documents"
                                    documentCategory="Rate-supporting"
                                    hideDynamicFeedback={isSubmittedOrCMSUser}
                                />
                            )}
                        </SectionCard>
                    )
                })
            ) : (
                <DataDetailMissingField />
            )}
        </SectionCard>
    )
}

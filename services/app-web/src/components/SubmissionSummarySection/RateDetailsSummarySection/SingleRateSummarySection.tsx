import React, { useState } from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import { DataDetail, DataDetailContactField } from '../../DataDetail'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import {
    ActuaryContact,
    ContractRevision,
    Program,
    Rate,
    RateFormData,
    useUnlockRateMutation,
} from '../../../gen/gqlClient'
import { UploadedDocumentsTable } from '../UploadedDocumentsTable'
import { SectionHeader } from '../../SectionHeader'
import { renderDownloadButton } from './RateDetailsSummarySection'
import { DocumentWarningBanner } from '../../Banner'
import { useS3 } from '../../../contexts/S3Context'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { recordJSException } from '../../../otelHelpers'
import { Grid } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import { UploadedDocumentsTableProps } from '../UploadedDocumentsTable/UploadedDocumentsTable'
import { useAuth } from '../../../contexts/AuthContext'
import { SectionCard } from '../../SectionCard'
import { UnlockRateButton } from './UnlockRateButton'
import { ActuaryCommunicationRecord, ERROR_MESSAGES } from '../../../constants'
import { handleApolloErrorsAndAddUserFacingMessages } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import { NavLinkWithLogging } from '../../TealiumLogging'

const rateCapitationType = (formData: RateFormData) =>
    formData.rateCapitationType
        ? formData.rateCapitationType === 'RATE_CELL'
            ? 'Certification of capitation rates specific to each rate cell'
            : 'Certification of rate ranges of capitation rates per rate cell'
        : ''

const ratePrograms = (
    formData: RateFormData,
    statePrograms: Program[],
    useHistoricPrograms: boolean
) => {
    /* if we have rateProgramIDs, use them, otherwise use programIDs */
    let programIDs = [] as string[]

    if (
        useHistoricPrograms &&
        formData.deprecatedRateProgramIDs &&
        formData.deprecatedRateProgramIDs.length > 0
    ) {
        programIDs = formData.deprecatedRateProgramIDs
    }
    if (formData.rateProgramIDs && formData.rateProgramIDs.length > 0) {
        programIDs = formData.rateProgramIDs
    }
    return programIDs
        ? statePrograms
              .filter((p) => programIDs.includes(p.id))
              .map((p) => p.name)
        : undefined
}

const rateCertificationType = (formData: RateFormData) => {
    if (formData.rateType === 'AMENDMENT') {
        return 'Amendment to prior rate certification'
    }
    if (formData.rateType === 'NEW') {
        return 'New rate certification'
    }
}

const relatedSubmissions = (
    contractRevisions: ContractRevision[]
): React.ReactElement => {
    return (
        <ul className={styles.commaList}>
            {contractRevisions.map((contractRev) => (
                <li key={contractRev.contractID}>
                    <NavLinkWithLogging
                        to={`/submissions/${contractRev.contractID}`}
                    >
                        {contractRev.contractName}
                    </NavLinkWithLogging>
                </li>
            ))}
        </ul>
    )
}

export const SingleRateSummarySection = ({
    rate,
    isSubmitted,
    statePrograms,
}: {
    rate: Rate
    isSubmitted: boolean
    statePrograms: Program[]
}): React.ReactElement | null => {
    const { loggedInUser } = useAuth()
    const navigate = useNavigate()

    const latestSubmission = rate.packageSubmissions?.[0]

    if (!latestSubmission) {
        return null
    }

    const rateRevision = latestSubmission.rateRevision
    const formData: RateFormData = rateRevision.formData
    const lastSubmittedDate = latestSubmission.submitInfo.updatedAt

    const isRateAmendment = formData.rateType === 'AMENDMENT'
    const isUnlocked = rate.status === 'UNLOCKED'
    const explainMissingData =
        !isSubmitted &&
        (loggedInUser?.role === 'STATE_USER' ||
            loggedInUser?.role === 'HELPDESK_USER')
    const isCMSUser = loggedInUser?.role === 'CMS_USER'
    const isSubmittedOrCMSUser =
        rate.status === 'SUBMITTED' ||
        rate.status === 'RESUBMITTED' ||
        loggedInUser?.role === 'CMS_USER'

    // feature flags
    const ldClient = useLDClient()
    const showRateUnlock: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )

    const linkedContracts = latestSubmission.contractRevisions

    // TODO BULK DOWNLOAD
    // needs to be wrap in a standalone hook
    const { getKey, getBulkDlURL } = useS3()
    const [documentError, setDocumentError] = useState(false)
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)

    const appendDraftToSharedPackages: UploadedDocumentsTableProps['packagesWithSharedRateCerts'] =
        rateRevision?.formData.packagesWithSharedRateCerts.map((pkg) => ({
            packageId: pkg.packageId,
            packageName:
                pkg.packageStatus === 'DRAFT'
                    ? pkg.packageName.concat(' (Draft)')
                    : pkg.packageName,
        }))

    const formatDatePeriod = (
        startDate: Date | undefined,
        endDate: Date | undefined
    ): string | undefined => {
        if (!startDate || !endDate) {
            return undefined
        }
        return `${formatCalendarDate(startDate)} to ${formatCalendarDate(endDate)}`
    }

    const validateActuary = (actuary: ActuaryContact): boolean => {
        if (!actuary?.name || !actuary?.email) {
            return false
        }
        return true
    }

    useDeepCompareEffect(() => {
        // get all the keys for the documents we want to zip
        async function fetchZipUrl() {
            const allRateDocuments =
                formData.rateDocuments.concat(formData.supportingDocuments) ||
                []

            const keysFromDocs = allRateDocuments
                .map((doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key) return ''
                    return key
                })
                .filter((key) => key !== '')

            // call the lambda to zip the files and get the url
            const zippedURL = await getBulkDlURL(
                keysFromDocs,
                formData.rateCertificationName + '-rate-details.zip',
                'HEALTH_PLAN_DOCS'
            )
            if (zippedURL instanceof Error) {
                const msg = `ERROR: getBulkDlURL failed to generate URL for a rate. ID: ${rate?.id} Message: ${zippedURL}`

                setDocumentError(true)
                recordJSException(msg)
            }

            setZippedFilesURL(zippedURL)
        }

        void fetchZipUrl()
    }, [getKey, getBulkDlURL, formData])
    // END bulk download logic

    const [unlockRate, { loading: unlockLoading }] = useUnlockRateMutation()

    const handleUnlockRate = async () => {
        try {
            const { data } = await unlockRate({
                variables: {
                    input: {
                        rateID: rate.id,
                        unlockedReason: '',
                    },
                },
            })

            if (data?.unlockRate.rate) {
                // don't do anything, eventually this entire function will be in the modal
            } else {
                recordJSException(
                    `[UNEXPECTED]: Error attempting to unlock rate, no data present.`
                )
                return new Error(ERROR_MESSAGES.unlock_error_generic)
            }
        } catch (error) {
            return handleApolloErrorsAndAddUserFacingMessages(
                error,
                'UNLOCK_RATE'
            )
        }
    }
    const parentContractSubmissionID = rate.parentContractID
    return (
        <React.Fragment key={rate.id}>
            <SectionCard
                id={`"rate-details-${rate.id}`}
                className={styles.summarySection}
            >
                <SectionHeader
                    header={
                        rate.revisions[0].formData.rateCertificationName ||
                        'Unknown rate name'
                    }
                >
                    {isCMSUser && showRateUnlock && (
                        <UnlockRateButton
                            disabled={isUnlocked || unlockLoading}
                            onClick={handleUnlockRate}
                        >
                            Unlock rate
                        </UnlockRateButton>
                    )}
                    {/* This second option is an interim state for unlock rate button (when linked rates is turned on but unlock and edit rate is not available yet). Remove when rate unlock is permanently on. */}
                    {isCMSUser && !showRateUnlock && (
                        <UnlockRateButton
                            disabled={isUnlocked || unlockLoading}
                            onClick={() => {
                                navigate(
                                    `/submissions/${parentContractSubmissionID}`
                                )
                            }}
                            link_url={`/submissions/${parentContractSubmissionID}`}
                        >
                            Unlock rate
                        </UnlockRateButton>
                    )}
                </SectionHeader>
                {documentError && (
                    <DocumentWarningBanner className={styles.banner} />
                )}
                <dl>
                    <DoubleColumnGrid>
                        {formData.deprecatedRateProgramIDs.length > 0 &&
                            isSubmittedOrCMSUser && (
                                <DataDetail
                                    id="historicRatePrograms"
                                    label="Programs this rate certification covers"
                                    explainMissingData={false} // this is a deprecated field, we never need to explain if its missing
                                    children={ratePrograms(
                                        formData,
                                        statePrograms,
                                        true
                                    )}
                                />
                            )}
                        <DataDetail
                            id="ratePrograms"
                            label="Rates this rate certification covers"
                            explainMissingData={explainMissingData}
                            children={ratePrograms(
                                formData,
                                statePrograms,
                                false
                            )}
                        />
                        <DataDetail
                            id="rateType"
                            label="Rate certification type"
                            explainMissingData={explainMissingData}
                            children={rateCertificationType(formData)}
                        />
                        <DataDetail
                            id="ratingPeriod"
                            label={
                                isRateAmendment
                                    ? 'Rating period of original rate certification'
                                    : 'Rating period'
                            }
                            explainMissingData={explainMissingData}
                            children={formatDatePeriod(
                                formData.rateDateStart,
                                formData.rateDateEnd
                            )}
                        />
                        <DataDetail
                            id="dateCertified"
                            label={
                                formData.rateType === 'AMENDMENT'
                                    ? 'Date certified for rate amendment'
                                    : 'Date certified'
                            }
                            explainMissingData={explainMissingData}
                            children={formatCalendarDate(
                                formData.rateDateCertified
                            )}
                        />
                        {isRateAmendment ? (
                            <DataDetail
                                id="effectiveRatingPeriod"
                                label="Rate amendment effective dates"
                                explainMissingData={explainMissingData}
                                children={formatDatePeriod(
                                    formData.amendmentEffectiveDateStart,
                                    formData.amendmentEffectiveDateEnd
                                )}
                            />
                        ) : null}
                        <DataDetail
                            id="rateSubmissionDate"
                            label="Rate submission date"
                            explainMissingData={explainMissingData}
                            children={formatCalendarDate(
                                rate.initiallySubmittedAt
                            )}
                        />
                        <DataDetail
                            id="rateCapitationType"
                            label="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                            explainMissingData={explainMissingData}
                            children={rateCapitationType(formData)}
                        />
                        <DataDetail
                            id="certifyingActuary"
                            label="Certifying actuary"
                            explainMissingData={explainMissingData}
                            children={
                                validateActuary(
                                    formData.certifyingActuaryContacts[0]
                                ) && (
                                    <DataDetailContactField
                                        contact={
                                            formData
                                                .certifyingActuaryContacts[0]
                                        }
                                    />
                                )
                            }
                        />
                        {formData.addtlActuaryContacts?.length
                            ? formData.addtlActuaryContacts.map(
                                  (contact, addtlContactIndex) => (
                                      <DataDetail
                                          key={`addtlCertifyingActuary-${addtlContactIndex}`}
                                          id={`addtlCertifyingActuary-${addtlContactIndex}`}
                                          label="Certifying actuary"
                                          explainMissingData={
                                              explainMissingData
                                          }
                                          children={
                                              validateActuary(contact) && (
                                                  <DataDetailContactField
                                                      contact={contact}
                                                  />
                                              )
                                          }
                                      />
                                  )
                              )
                            : null}
                    </DoubleColumnGrid>
                    <Grid row gap className={styles.singleColumnGrid}>
                        <DataDetail
                            id="communicationPreference"
                            label="Actuaries’ communication preference"
                            children={
                                formData.actuaryCommunicationPreference &&
                                ActuaryCommunicationRecord[
                                    formData.actuaryCommunicationPreference
                                ]
                            }
                            explainMissingData={explainMissingData}
                        />
                        <DataDetail
                            id="submittedWithContract"
                            label="Contract actions"
                            children={relatedSubmissions(linkedContracts)}
                        />
                    </Grid>
                </dl>
            </SectionCard>
            <SectionCard className={styles.summarySection}>
                <SectionHeader header="Rate documents">
                    {renderDownloadButton(zippedFilesURL)}
                </SectionHeader>
                <UploadedDocumentsTable
                    documents={formData.rateDocuments}
                    packagesWithSharedRateCerts={appendDraftToSharedPackages}
                    multipleDocumentsAllowed={false}
                    previousSubmissionDate={lastSubmittedDate}
                    caption="Rate certification"
                    hideDynamicFeedback={!isSubmittedOrCMSUser}
                />
                <UploadedDocumentsTable
                    documents={formData.supportingDocuments}
                    packagesWithSharedRateCerts={appendDraftToSharedPackages}
                    previousSubmissionDate={lastSubmittedDate}
                    caption="Rate supporting documents"
                    hideDynamicFeedback={!isSubmittedOrCMSUser}
                />
            </SectionCard>
        </React.Fragment>
    )
}

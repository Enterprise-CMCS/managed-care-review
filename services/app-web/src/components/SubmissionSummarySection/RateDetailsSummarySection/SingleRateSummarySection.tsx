import React, { useState } from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { DoubleColumnGrid } from '../../DoubleColumnGrid'
import {
    DataDetail,
    DataDetailContactField,
    DataDetailMissingField,
} from '../../DataDetail'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import {
    Program,
    Rate,
    RateFormData,
    RateRevision,
    RelatedContractRevisions,
    useUnlockRateMutation,
} from '../../../gen/gqlClient'
import { UploadedDocumentsTable } from '../UploadedDocumentsTable'
import type { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'
import { SectionHeader } from '../../SectionHeader'
import { renderDownloadButton } from './RateDetailsSummarySection'
import { DocumentWarningBanner } from '../../Banner'
import { useS3 } from '../../../contexts/S3Context'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { recordJSException } from '../../../otelHelpers'
import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import { packageName } from '../../../common-code/healthPlanFormDataType'
import { UploadedDocumentsTableProps } from '../UploadedDocumentsTable/UploadedDocumentsTable'
import { useAuth } from '../../../contexts/AuthContext'
import { SectionCard } from '../../SectionCard'
import { UnlockRateButton } from './UnlockRateButton'
import { ERROR_MESSAGES } from '../../../constants'
import { handleApolloErrorsAndAddUserFacingMessages } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'

// This rate summary pages assumes we are using contract and rates API.
// Eventually RateDetailsSummarySection should share code with this code
// shipping with copypasta for now to demo rates refactor

function makeRateDocumentDateTable(
    revisions: RateRevision[]
): DocumentDateLookupTableType {
    const lookupTable: DocumentDateLookupTableType = {
        previousSubmissionDate: null,
    }
    revisions.forEach((revision: RateRevision, index: number) => {
        if (index === 1) {
            // second most recent revision
            const previousSubmission = revision.submitInfo?.updatedAt // used in UploadedDocumentsTable to determine if we should show NEW tag
            if (previousSubmission)
                lookupTable['previousSubmissionDate'] = previousSubmission
        }

        const allDocuments =
            revision.formData?.supportingDocuments.concat(
                revision.formData?.rateDocuments
            ) || []
        allDocuments.forEach((doc) => {
            const documentKey = doc.sha256
            const dateAdded = revision.submitInfo?.updatedAt
            if (dateAdded) lookupTable[documentKey] = dateAdded
        })
    })
    return lookupTable
}

const rateCapitationType = (formData: RateFormData) =>
    formData.rateCapitationType
        ? formData.rateCapitationType === 'RATE_CELL'
            ? 'Certification of capitation rates specific to each rate cell'
            : 'Certification of rate ranges of capitation rates per rate cell'
        : ''

const ratePrograms = (formData: RateFormData, statePrograms: Program[]) => {
    /* if we have rateProgramIDs, use them, otherwise use programIDs */
    let programIDs = [] as string[]
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
    contractRevisions: RelatedContractRevisions[],
    statePrograms: Program[]
): React.ReactElement => {
    return (
        <>
            {contractRevisions.map((contractRev) => (
                <Link
                    key={contractRev.contract.id}
                    asCustom={NavLink}
                    to={`/submissions/${contractRev.contract.id}`}
                >
                    {packageName(
                        contractRev.contract.stateCode,
                        contractRev.contract.stateNumber,
                        contractRev.formData.programIDs,
                        statePrograms
                    )}
                </Link>
            ))}
        </>
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
    const rateRevision = rate.revisions[0]
    const formData: RateFormData = rateRevision?.formData
    const documentDateLookupTable = makeRateDocumentDateTable(rate.revisions)
    const isRateAmendment = formData.rateType === 'AMENDMENT'
    const isUnlocked = rate.status === 'UNLOCKED'
    const explainMissingData =
        !isSubmitted && loggedInUser?.role === 'STATE_USER'
    const isCMSUser = loggedInUser?.role === 'CMS_USER'

    // feature flags
    const ldClient = useLDClient()
    const showRateUnlock: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )

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
                // navigate('') TODO
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

    return (
        <React.Fragment key={rate.id}>
            <SectionCard
                id={`"rate-details-${rate.id}`}
                className={styles.summarySection}
            >
                <dl>
                    <SectionHeader
                        header={
                            rate.revisions[0].formData.rateCertificationName ||
                            'Unknown rate name'
                        }
                    >
                        {showRateUnlock && isCMSUser ? (
                            <UnlockRateButton
                                disabled={isUnlocked || unlockLoading}
                                onClick={handleUnlockRate}
                            >
                                Unlock rate
                            </UnlockRateButton>
                        ) : null}
                    </SectionHeader>
                    {documentError && (
                        <DocumentWarningBanner className={styles.banner} />
                    )}

                    <DoubleColumnGrid>
                        {ratePrograms && (
                            <DataDetail
                                id="ratePrograms"
                                label="Programs this rate certification covers"
                                explainMissingData={explainMissingData}
                                children={ratePrograms(formData, statePrograms)}
                            />
                        )}
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
                            children={
                                formData.rateDateStart &&
                                formData.rateDateEnd ? (
                                    `${formatCalendarDate(
                                        formData.rateDateStart
                                    )} to ${formatCalendarDate(
                                        formData.rateDateEnd
                                    )}`
                                ) : (
                                    <DataDetailMissingField />
                                )
                            }
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
                                children={`${formatCalendarDate(
                                    formData.amendmentEffectiveDateStart
                                )} to ${formatCalendarDate(
                                    formData.amendmentEffectiveDateEnd
                                )}`}
                            />
                        ) : null}
                        <DataDetail
                            id="certifyingActuary"
                            label="Certifying actuary"
                            explainMissingData={explainMissingData}
                            children={
                                <DataDetailContactField
                                    contact={
                                        formData.certifyingActuaryContacts[0]
                                    }
                                />
                            }
                        />
                        <DataDetail
                            id="rateSubmissionDate"
                            label="Rate submission date"
                            explainMissingData={!isSubmitted}
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
                            id="submittedWithContract"
                            label="Submission this rate was submitted with"
                            explainMissingData={explainMissingData}
                            children={relatedSubmissions(
                                rateRevision?.contractRevisions,
                                statePrograms
                            )}
                        />
                    </DoubleColumnGrid>
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
                    documentDateLookupTable={documentDateLookupTable}
                    caption="Rate certification"
                />
                <UploadedDocumentsTable
                    documents={formData.supportingDocuments}
                    packagesWithSharedRateCerts={appendDraftToSharedPackages}
                    documentDateLookupTable={documentDateLookupTable}
                    caption="Rate supporting documents"
                />
            </SectionCard>
        </React.Fragment>
    )
}

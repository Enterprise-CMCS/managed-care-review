import React from 'react'
import styles from '../SubmissionSummarySection.module.scss'
import { MultiColumnGrid } from '../../MultiColumnGrid'
import {
    DataDetail,
    DataDetailCheckboxList,
    DataDetailContactField,
} from '../../DataDetail'
import { formatCalendarDate } from '@mc-review/dates'
import {
    ActuaryContact,
    ContractRevision,
    Program,
    Rate,
    RateFormData,
} from '../../../gen/gqlClient'
import { UploadedDocumentsTable } from '../UploadedDocumentsTable'
import { SectionHeader } from '../../SectionHeader'
import { DocumentWarningBanner } from '../../Banner'
import { Grid } from '@trussworks/react-uswds'
import { UploadedDocumentsTableProps } from '../UploadedDocumentsTable/UploadedDocumentsTable'
import { useAuth } from '../../../contexts/AuthContext'
import { SectionCard } from '../../SectionCard'
import {
    ActuaryCommunicationRecord,
    RateMedicaidPopulationsRecord,
} from '@mc-review/hpp'
import { NavLinkWithLogging } from '../../TealiumLogging'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { ZipDownloadLink } from '../../ZipDownloadLink/ZipDownloadLink'

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
): React.ReactElement | null => {
    if (contractRevisions.length === 0) {
        return null
    }
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
    const ldClient = useLDClient()
    const latestSubmission = rate.packageSubmissions?.[0]
    if (!latestSubmission) {
        // This is unusual and ugly, we try not to throw ever, but we can't early return here.
        // of course if the array were required we would just silently throw if its empty
        throw new Error(
            'programming error: should not have a summarized rate without a submission'
        )
    }

    const rateRevision = latestSubmission.rateRevision
    const formData: RateFormData = rateRevision.formData
    const lastSubmittedDate = latestSubmission.submitInfo.updatedAt
    const medicaidPopulations = (formData.rateMedicaidPopulations ??
        []) as string[]

    const isRateAmendment = formData.rateType === 'AMENDMENT'
    const explainMissingData =
        !isSubmitted &&
        (loggedInUser?.role === 'STATE_USER' ||
            loggedInUser?.role === 'HELPDESK_USER')
    const isCMSUser = hasCMSUserPermissions(loggedInUser)
    const isSubmittedOrCMSUser =
        rate.status === 'SUBMITTED' ||
        rate.status === 'RESUBMITTED' ||
        isCMSUser
    const isWithdrawn = rate.consolidatedStatus === 'WITHDRAWN'
    const isDsnpEnabled = ldClient?.variation(
        featureFlags.DSNP.flag,
        featureFlags.DSNP.defaultValue
    )

    const withdrawnFromContractRevs =
        rate.withdrawnFromContracts?.reduce((acc, contract) => {
            const latestRevision =
                contract.packageSubmissions?.[0].contractRevision
            if (latestRevision) {
                acc.push(latestRevision)
            }
            return acc
        }, [] as ContractRevision[]) ?? []

    const contractActions = isWithdrawn
        ? withdrawnFromContractRevs
        : latestSubmission.contractRevisions

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
        return `${formatCalendarDate(startDate, 'UTC')} to ${formatCalendarDate(endDate, 'UTC')}`
    }

    const validateActuary = (actuary: ActuaryContact): boolean => {
        return !(!actuary?.name || !actuary?.email)
    }
    const rateDocumentCount =
        formData.supportingDocuments &&
        formData.rateDocuments &&
        formData.supportingDocuments.length + formData.rateDocuments.length
    const documentZipPackage = rateRevision.documentZipPackages
        ? rateRevision.documentZipPackages
        : undefined

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
                    hideBorderTop
                />
                {!documentZipPackage && (
                    <DocumentWarningBanner className={styles.banner} />
                )}
                <dl>
                    <MultiColumnGrid columns={2}>
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
                        {isDsnpEnabled && medicaidPopulations.length !== 0 && (
                            <DataDetail
                                id="medicaidPop"
                                label="Medicaid populations included in this rate certification"
                                explainMissingData={explainMissingData}
                                children={
                                    <DataDetailCheckboxList
                                        list={medicaidPopulations}
                                        dict={RateMedicaidPopulationsRecord}
                                        displayEmptyList={!explainMissingData}
                                    />
                                }
                            />
                        )}
                        <DataDetail
                            id="rateType"
                            label="Rate certification type"
                            explainMissingData={explainMissingData}
                            children={rateCertificationType(formData)}
                        />
                    </MultiColumnGrid>
                    <MultiColumnGrid columns={2}>
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
                                formData.rateDateCertified,
                                'UTC'
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
                                rate.initiallySubmittedAt,
                                'America/Los_Angeles'
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
                    </MultiColumnGrid>
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
                            explainMissingData
                            explainMissingDataMsg="Missing contract action"
                            children={relatedSubmissions(contractActions)}
                        />
                    </Grid>
                </dl>
            </SectionCard>
            <SectionCard className={styles.summarySection}>
                <SectionHeader header="Rate documents" hideBorderTop>
                    <ZipDownloadLink
                        type={'SINGLE-RATE'}
                        documentZipPackages={documentZipPackage}
                        documentCount={rateDocumentCount}
                    />
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

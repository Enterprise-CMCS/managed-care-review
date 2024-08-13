/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { useState } from 'react'
import { DataDetail } from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { useS3 } from '../../../contexts/S3Context'
import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DoubleColumnGrid } from '../../../components/DoubleColumnGrid'
import { DownloadButton } from '../../../components/DownloadButton'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../../../components/SubmissionSummarySection/SubmissionSummarySection.module.scss'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

import { recordJSException } from '../../../otelHelpers'
import { DataDetailMissingField } from '../../../components/DataDetail/DataDetailMissingField'
import { DataDetailContactField } from '../../../components/DataDetail/DataDetailContactField/DataDetailContactField'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { InlineDocumentWarning } from '../../../components/DocumentWarning'
import { SectionCard } from '../../../components/SectionCard'
import {
    Rate,
    Contract,
    ContractRevision,
    Program,
    RateRevision,
    RateFormData,
    HealthPlanPackageStatus,
    ActuaryContact,
} from '../../../gen/gqlClient'
import {
    RateRevisionWithIsLinked,
    getIndexFromRevisionVersion,
    getLastContractSubmission,
    getPackageSubmissionAtIndex,
    getVisibleLatestRateRevisions,
} from '../../../gqlHelpers/contractsAndRates'
import { useAuth } from '../../../contexts/AuthContext'
import { ActuaryCommunicationRecord } from '../../../constants'
import { useParams } from 'react-router-dom'
import { LinkWithLogging } from '../../../components/TealiumLogging/Link'
import classnames from 'classnames'
import { hasCMSUserPermissions } from '../../../gqlHelpers'

export type RateDetailsSummarySectionProps = {
    contract: Contract
    contractRev?: ContractRevision
    rateRevisions?: RateRevisionWithIsLinked[]
    editNavigateTo?: string
    isCMSUser?: boolean
    submissionName: string
    statePrograms: Program[]
    onDocumentError?: (error: true) => void
    explainMissingData?: boolean
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

export const RateDetailsSummarySection = ({
    contract,
    rateRevisions,
    editNavigateTo,
    submissionName,
    statePrograms,
    onDocumentError,
    explainMissingData,
}: RateDetailsSummarySectionProps): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { revisionVersion } = useParams()
    const isSubmitted =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
    const isCMSUser = hasCMSUserPermissions(loggedInUser)
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const isSubmittedOrCMSUser = isSubmitted || isCMSUser
    const isEditing = !isSubmittedOrCMSUser && editNavigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()
    const isInitialSubmission = contract.packageSubmissions.length === 1

    const rateRevs = rateRevisions
        ? rateRevisions
        : getVisibleLatestRateRevisions(contract, isEditing)

    // Calculate last submitted data for document upload tables
    const lastSubmittedIndex = getIndexFromRevisionVersion(
        contract,
        Number(revisionVersion)
    )
    const lastSubmittedDate = isPreviousSubmission
        ? getPackageSubmissionAtIndex(contract, lastSubmittedIndex)?.submitInfo
              .updatedAt
        : getLastContractSubmission(contract)?.submitInfo.updatedAt ?? null

    const { getKey, getBulkDlURL } = useS3()
    const [zippedFilesURL, setZippedFilesURL] = useState<
        string | undefined | Error
    >(undefined)
    const [packageNamesLookup] = React.useState<PackageNamesLookupType | null>(
        null
    )

    // For show deprecated shared rates across packages when the submission for historical data
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

    const formatDatePeriod = (
        startDate: Date | undefined,
        endDate: Date | undefined
    ): string | undefined => {
        if (!startDate || !endDate) {
            return undefined
        }
        return `${formatCalendarDate(startDate)} to ${formatCalendarDate(endDate)}`
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

    const validateActuary = (actuary: ActuaryContact): boolean => {
        if (!actuary?.name || !actuary?.email) {
            return false
        }
        return true
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

    const replaceRateClass = (isLinkedRate: boolean) =>
        classnames({
            [styles.replaceRateWrapper]:
                isAdminUser && !isLinkedRate && !isPreviousSubmission,
        })

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
            {rateRevs && rateRevs.length > 0
                ? rateRevs.map((rateRev) => {
                      const rateFormData = getRateFormData(rateRev)
                      const hasDeprecatedRatePrograms =
                          rateFormData.deprecatedRateProgramIDs.length > 0
                      const hasNoRatePrograms =
                          rateFormData.rateProgramIDs.length === 0
                      const isLinkedRate = rateRev.isLinked
                      // Is this rate linked to by another contract
                      const isLinkedTo = rateRev.contractRevisions.length > 1

                      /**
                    Rate programs switched in summer 2024. We still show deprecated program field values when
                    - there's no new field values present and CMS user is viewing
                    - theres no new field values present and contract is locked and state user viewing
                    - theres no new field values present and the contract unlocked and the rate being displayed as a linked rate

                    otherwise use new fields values going forward
                    **/

                      const showLegacyRatePrograms =
                          hasDeprecatedRatePrograms &&
                          hasNoRatePrograms &&
                          (isSubmittedOrCMSUser || isLinkedRate)
                      const showReplaceRateBtn =
                          isAdminUser &&
                          !isPreviousSubmission &&
                          !isLinkedRate &&
                          !isLinkedTo
                      if (!rateFormData) {
                          return <GenericErrorPage />
                      }

                      return (
                          <SectionCard
                              id={`rate-details-${rateRev.id}`}
                              key={rateRev.id}
                          >
                              <div className={replaceRateClass(isLinkedRate)}>
                                  <h3
                                      aria-label={`Rate ID: ${rateFormData.rateCertificationName}`}
                                      className={styles.rateName}
                                  >
                                      {rateFormData.rateCertificationName}
                                  </h3>
                                  {showReplaceRateBtn && (
                                      <LinkWithLogging
                                          href={`/submissions/${contract.id}/replace-rate/${rateRev.rateID}`}
                                          className={
                                              'usa-button usa-button--outline'
                                          }
                                          variant="unstyled"
                                      >
                                          Replace rate
                                      </LinkWithLogging>
                                  )}
                              </div>
                              <dl>
                                  <DoubleColumnGrid>
                                      {showLegacyRatePrograms ? (
                                          <DataDetail
                                              id="historicRatePrograms"
                                              label="Programs this rate certification covers"
                                              explainMissingData={
                                                  false // this is a deprecated field, we never need to explain if its missing
                                              }
                                              children={ratePrograms(
                                                  rateRev,
                                                  true
                                              )}
                                          />
                                      ) : (
                                          <DataDetail
                                              id="ratePrograms"
                                              label="Rates this rate certification covers"
                                              explainMissingData={
                                                  isLinkedRate
                                                      ? false
                                                      : explainMissingData
                                              }
                                              children={ratePrograms(
                                                  rateRev,
                                                  false
                                              )}
                                          />
                                      )}
                                      <DataDetail
                                          id="rateType"
                                          label="Rate certification type"
                                          explainMissingData={
                                              isLinkedRate
                                                  ? false
                                                  : explainMissingData
                                          }
                                          children={rateCertificationType(
                                              rateRev
                                          )}
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
                                              isLinkedRate
                                                  ? false
                                                  : explainMissingData
                                          }
                                          children={formatDatePeriod(
                                              rateFormData.rateDateStart,
                                              rateFormData.rateDateEnd
                                          )}
                                      />
                                      <DataDetail
                                          id="dateCertified"
                                          label={
                                              rateFormData.amendmentEffectiveDateStart
                                                  ? 'Date certified for rate amendment'
                                                  : 'Date certified'
                                          }
                                          explainMissingData={
                                              isLinkedRate
                                                  ? false
                                                  : explainMissingData
                                          }
                                          children={formatCalendarDate(
                                              rateFormData.rateDateCertified
                                          )}
                                      />
                                      {rateFormData.rateType === 'AMENDMENT' ? (
                                          <DataDetail
                                              id="effectiveRatingPeriod"
                                              label="Rate amendment effective dates"
                                              explainMissingData={
                                                  isLinkedRate
                                                      ? false
                                                      : explainMissingData
                                              }
                                              children={formatDatePeriod(
                                                  rateFormData.amendmentEffectiveDateStart,
                                                  rateFormData.amendmentEffectiveDateEnd
                                              )}
                                          />
                                      ) : null}
                                      <DataDetail
                                          id="rateCapitationType"
                                          label="Does the actuary certify capitation rates specific to each rate cell or a rate range?"
                                          explainMissingData={
                                              isLinkedRate
                                                  ? false
                                                  : explainMissingData
                                          }
                                          children={rateCapitationType(rateRev)}
                                      />
                                      <DataDetail
                                          id="certifyingActuary"
                                          label="Certifying actuary"
                                          explainMissingData={
                                              isLinkedRate
                                                  ? false
                                                  : explainMissingData
                                          }
                                          children={
                                              validateActuary(
                                                  rateFormData
                                                      .certifyingActuaryContacts[0]
                                              ) && (
                                                  <DataDetailContactField
                                                      contact={
                                                          rateFormData
                                                              .certifyingActuaryContacts[0]
                                                      }
                                                  />
                                              )
                                          }
                                      />
                                      {rateFormData.addtlActuaryContacts.map(
                                          (contact, addtlContactIndex) => (
                                              <DataDetail
                                                  key={`addtlCertifyingActuary-${addtlContactIndex}`}
                                                  id={`addtlCertifyingActuary-${addtlContactIndex}`}
                                                  label="Certifying actuary"
                                                  explainMissingData={
                                                      isLinkedRate
                                                          ? false
                                                          : explainMissingData
                                                  }
                                                  children={
                                                      validateActuary(
                                                          contact
                                                      ) && (
                                                          <DataDetailContactField
                                                              contact={contact}
                                                          />
                                                      )
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
                                              isLinkedRate
                                                  ? false
                                                  : explainMissingData
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
                                      isInitialSubmission={isInitialSubmission}
                                      previousSubmissionDate={
                                          isInitialSubmission && isCMSUser
                                              ? undefined
                                              : lastSubmittedDate
                                      }
                                      hideDynamicFeedback={isSubmittedOrCMSUser}
                                  />
                              )}
                              {rateFormData.supportingDocuments && (
                                  <UploadedDocumentsTable
                                      documents={
                                          rateFormData.supportingDocuments
                                      }
                                      isInitialSubmission={isInitialSubmission}
                                      previousSubmissionDate={
                                          isInitialSubmission && isCMSUser
                                              ? undefined
                                              : lastSubmittedDate
                                      }
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
                : explainMissingData && <DataDetailMissingField />}
        </SectionCard>
    )
}

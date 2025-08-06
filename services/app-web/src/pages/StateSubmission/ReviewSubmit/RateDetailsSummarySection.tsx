import React, { useEffect, useState } from 'react'
import {
    DataDetail,
    DataDetailCheckboxList,
} from '../../../components/DataDetail'
import { SectionHeader } from '../../../components/SectionHeader'
import { formatCalendarDate } from '@mc-review/dates'
import { MultiColumnGrid } from '../../../components/MultiColumnGrid'
import { UploadedDocumentsTable } from '../../../components/SubmissionSummarySection'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../../../components/SubmissionSummarySection/SubmissionSummarySection.module.scss'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

import { DataDetailMissingField } from '../../../components/DataDetail/DataDetailMissingField'
import { DataDetailContactField } from '../../../components/DataDetail/DataDetailContactField/DataDetailContactField'
import { InlineDocumentWarning } from '../../../components/DocumentWarning'
import { SectionCard } from '../../../components/SectionCard'
import {
    Rate,
    Contract,
    UnlockedContract,
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
} from '@mc-review/helpers'
import { useAuth } from '../../../contexts/AuthContext'
import {
    ActuaryCommunicationRecord,
    RateMedicaidPopulationsRecord,
} from '@mc-review/hpp'
import { useParams } from 'react-router-dom'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { InfoTag } from '../../../components/InfoTag/InfoTag'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { getRateZipDownloadUrl } from '../../../helpers/zipHelpers'
import { LinkWithLogging } from '../../../components'

export type RateDetailsSummarySectionProps = {
    contract: Contract | UnlockedContract
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

export function renderZipLink(
    zippedFilesURL: string | undefined | Error,
    rateDocumentCount: number | undefined
) {
    if (zippedFilesURL instanceof Error || !zippedFilesURL) {
        return (
            <InlineDocumentWarning message="Rate document download is unavailable" />
        )
    }
    return (
        <LinkWithLogging
            variant="unstyled"
            href={zippedFilesURL}
            target="_blank"
        >
            <p>
                Download rate documents{' '}
                {rateDocumentCount && `(${rateDocumentCount} files)`}
            </p>
        </LinkWithLogging>
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
    const ldClient = useLDClient()
    const isSubmitted =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
    const isCMSUser = hasCMSUserPermissions(loggedInUser)
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isSubmittedOrCMSUser = isSubmitted || isCMSUser
    const isEditing = !isSubmittedOrCMSUser && editNavigateTo !== undefined
    const isPreviousSubmission = usePreviousSubmission()
    const isInitialSubmission = contract.packageSubmissions.length === 1
    const isDsnpEnabled = ldClient?.variation(
        featureFlags.DSNP.flag,
        featureFlags.DSNP.defaultValue
    )

    const rateRevs = rateRevisions
        ? rateRevisions
        : getVisibleLatestRateRevisions(contract, isEditing)

    const withdrawnRateRevisions: RateRevision[] =
        contract.withdrawnRates?.reduce((acc, rate) => {
            const latestRevision = rate.packageSubmissions?.[0].rateRevision
            if (rate.consolidatedStatus === 'WITHDRAWN' && latestRevision) {
                acc.push(latestRevision)
            }
            return acc
        }, [] as RateRevision[]) ?? []

    // Calculate last submitted data for document upload tables
    const lastSubmittedIndex = getIndexFromRevisionVersion(
        contract,
        Number(revisionVersion)
    )
    const lastSubmittedDate = isPreviousSubmission
        ? getPackageSubmissionAtIndex(contract, lastSubmittedIndex)?.submitInfo
              .updatedAt
        : (getLastContractSubmission(contract)?.submitInfo.updatedAt ?? null)
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
        return `${formatCalendarDate(startDate, 'UTC')} to ${formatCalendarDate(endDate, 'UTC')}`
    }

    const getRateFormData = (rate: Rate | RateRevision): RateFormData => {
        const isRateRev = 'formData' in rate
        if (!isRateRev) {
            // TODO: make this support an unlocked child rate.
            if (rate.status === 'DRAFT') {
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

    useEffect(() => {
        const currentRateRev = rateRevs && rateRevs[0]
        if (
            isSubmittedOrCMSUser &&
            !isPreviousSubmission &&
            currentRateRev?.documentZipPackages
        ) {
            const zipURL = getRateZipDownloadUrl(
                currentRateRev.documentZipPackages
            )
            setZippedFilesURL(zipURL)
        }
    }, [isSubmittedOrCMSUser, isPreviousSubmission, rateRevs])

    const noRatesMessage = () => {
        if (isStateUser) {
            return isSubmitted
                ? 'You must contact your CMS point of contact and request an unlock.'
                : 'You must add a rate certification before you can resubmit.'
        }

        if (isCMSUser) {
            return 'You must unlock the submission so the state can add a rate certification.'
        }

        return 'CMS must unlock the submission so the state can add a rate certification.'
    }

    return (
        <SectionCard id="rateDetails" className={styles.summarySection}>
            <SectionHeader
                header="Rate details"
                editNavigateTo={editNavigateTo}
                hideBorderTop
                hideBorderBottom
            />
            {rateRevs && rateRevs.length > 0
                ? rateRevs.map((rateRev) => {
                      const rateFormData = getRateFormData(rateRev)
                      const hasDeprecatedRatePrograms =
                          rateFormData.deprecatedRateProgramIDs.length > 0
                      const hasNoRatePrograms =
                          rateFormData.rateProgramIDs.length === 0
                      const isLinkedRate = rateRev.isLinked
                      const medicaidPopulations =
                          (rateFormData.rateMedicaidPopulations ??
                              []) as string[]
                      const contractIsDsnp =
                          contract.packageSubmissions[0]?.contractRevision
                              ?.formData?.dsnpContract === true ||
                          contract.draftRevision?.formData?.dsnpContract ===
                              true
                      const rateDocumentCount =
                          rateFormData.supportingDocuments &&
                          rateFormData.rateDocuments &&
                          rateFormData.supportingDocuments.length +
                              rateFormData.rateDocuments.length
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

                      return (
                          <SectionCard
                              id={`rate-details-${rateRev.id}`}
                              key={rateRev.id}
                          >
                              <div>
                                  <h3
                                      aria-label={`Rate ID: ${rateFormData.rateCertificationName}`}
                                      className={styles.rateName}
                                  >
                                      {rateFormData.rateCertificationName}
                                  </h3>
                              </div>
                              <dl>
                                  <MultiColumnGrid columns={2}>
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
                                      {isDsnpEnabled && contractIsDsnp && (
                                          <DataDetail
                                              id="medicaidPop"
                                              label="Medicaid populations included in this rate certification"
                                              explainMissingData={
                                                  isLinkedRate
                                                      ? false
                                                      : explainMissingData &&
                                                        rateRev.formData
                                                            .rateMedicaidPopulations
                                                            ?.length === 0
                                              }
                                              children={
                                                  <DataDetailCheckboxList
                                                      list={medicaidPopulations}
                                                      dict={
                                                          RateMedicaidPopulationsRecord
                                                      }
                                                      displayEmptyList={
                                                          !explainMissingData
                                                      }
                                                  />
                                              }
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
                                  </MultiColumnGrid>
                                  <MultiColumnGrid columns={2}>
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
                                              rateFormData.rateDateCertified,
                                              'UTC'
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
                                  </MultiColumnGrid>
                                  <MultiColumnGrid columns={1}>
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
                                  </MultiColumnGrid>
                              </dl>
                              <SectionHeader
                                  header="Rate documents"
                                  hideBorderBottom
                                  as="h3"
                              >
                                  {isSubmittedOrCMSUser &&
                                      !isPreviousSubmission &&
                                      rateRevs &&
                                      rateRevs.length > 0 &&
                                      renderZipLink(
                                          zippedFilesURL,
                                          rateDocumentCount
                                      )}
                              </SectionHeader>
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
                : (isSubmitted || isStateUser) && (
                      <DataDetailMissingField requiredText={noRatesMessage()} />
                  )}
            {withdrawnRateRevisions.length > 0 &&
                withdrawnRateRevisions.map((rateRev) => (
                    <SectionCard
                        id={`withdrawn-rate-${rateRev.id}`}
                        key={rateRev.id}
                    >
                        <h3
                            aria-label={`Rate ID: ${rateRev.formData.rateCertificationName}`}
                            className={styles.rateName}
                        >
                            <InfoTag color="gray-medium">WITHDRAWN</InfoTag>{' '}
                            {rateRev.formData.rateCertificationName}
                        </h3>
                    </SectionCard>
                ))}
        </SectionCard>
    )
}

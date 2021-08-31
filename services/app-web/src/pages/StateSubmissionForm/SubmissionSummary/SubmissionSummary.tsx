import React, { useEffect, useState } from 'react'
import { GridContainer, Grid, Link } from '@trussworks/react-uswds'
import { NavLink, useParams, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import sprite from 'uswds/src/img/sprite.svg'

import stylesForm from '../ReviewSubmit/ReviewSubmit.module.scss'
import styles from './SubmissionSummary.module.scss'

import { Document, useFetchStateSubmissionQuery } from '../../../gen/gqlClient'
import {
    AmendableItemsRecord,
    ContractTypeRecord,
    FederalAuthorityRecord,
    RateChangeReasonRecord,
    ManagedCareEntityRecord,
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
    SubmissionTypeRecord,
} from '../../../constants/submissions'
import { DataDetail } from '../../../components/DataDetail/DataDetail'
import { DoubleColumnRow } from '../../../components/DoubleColumnRow/DoubleColumnRow'
import { Loading } from '../../../components/Loading'
import { GenericError } from '../../Errors/GenericError'
import { useS3 } from '../../../contexts/S3Context'
import { usePage } from '../../../contexts/PageContext'
import { useAuth } from '../../../contexts/AuthContext'

type DocumentWithLink = { url: string | null } & Document

const SectionHeader = ({
    header,
}: {
    header: string
    to: string
}): React.ReactElement => {
    return (
        <div className={styles.sectionHeader}>
            <h2>{header}</h2>
        </div>
    )
}

export const SubmissionSummary = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { loggedInUser } = useAuth()
    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])
    const { getURL, getKey } = useS3()
    const { updateHeading } = usePage()

    const { loading, error, data } = useFetchStateSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const submission = data?.fetchStateSubmission.submission

    useEffect(() => {
        updateHeading(pathname, submission?.name)
    }, [updateHeading, pathname, submission?.name])

    useEffect(() => {
        const refreshDocuments = async () => {
            if (!submission) return

            const newDocs = await Promise.all(
                submission.documents.map(async (doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key)
                        return {
                            ...doc,
                            url: null,
                        }

                    const documentLink = await getURL(key)
                    return {
                        ...doc,
                        url: documentLink,
                    }
                })
            ).catch((_err) => {
                return []
            })
            setRefreshedDocs(newDocs)
        }

        void refreshDocuments()
    }, [submission, getKey, getURL])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error || !submission) return <GenericError />

    const documentsSummary = `${submission.documents.length} ${
        submission.documents.length === 1 ? 'file' : 'files'
    }`
    // Array of values from a checkbox field is displayed in a comma-separated list
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

        // strip nulls and leftover commas at the end
        return listToDisplay
            .filter((el) => {
                return el !== null
            })
            .join(', ')
            .replace(/,\s*$/, '')
    }

    const capitationRateChangeReason = (): string | null => {
        const { reason, otherReason } =
            submission?.contractAmendmentInfo?.capitationRatesAmendedInfo || {}
        if (!reason) return null

        return otherReason
            ? `${AmendableItemsRecord['CAPITATION_RATES']} (${otherReason})`
            : `${AmendableItemsRecord['CAPITATION_RATES']} (${RateChangeReasonRecord[reason]})`
    }

    const isContractAmendment = submission.contractType === 'AMENDMENT'
    const isContractActionAndRateCertification =
        submission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {loggedInUser?.__typename === 'StateUser' ? (
                    <Link
                        asCustom={NavLink}
                        variant="unstyled"
                        to={{
                            pathname: '/dashboard',
                            state: {
                                defaultProgramID: submission.programID,
                            },
                        }}
                    >
                        <svg
                            className="usa-icon"
                            aria-hidden="true"
                            focusable="false"
                            role="img"
                        >
                            <use xlinkHref={`${sprite}#arrow_back`}></use>
                        </svg>
                        <span>&nbsp;Back to state dashboard</span>
                    </Link>
                ) : null}
                <section id="submissionType">
                    <div className={styles.firstHeader}>
                        <h2 className={stylesForm.submissionName}>
                            {submission.name}
                        </h2>
                    </div>
                    <dl>
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="program"
                                    label="Program"
                                    data={submission.program.name}
                                />
                            }
                            right={
                                <DataDetail
                                    id="submissionType"
                                    label="Submission type"
                                    data={
                                        SubmissionTypeRecord[
                                            submission.submissionType
                                        ]
                                    }
                                />
                            }
                        />
                        <Grid row gap className={stylesForm.reviewDataRow}>
                            <Grid col={12}>
                                <DataDetail
                                    id="submissionDescription"
                                    label="Submission description"
                                    data={submission.submissionDescription}
                                />
                            </Grid>
                        </Grid>
                    </dl>
                </section>
                <section id="contractDetails">
                    <SectionHeader
                        header="Contract details"
                        to="contract-details"
                    />
                    <dl>
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="contractType"
                                    label="Contract action type"
                                    data={
                                        submission.contractType
                                            ? ContractTypeRecord[
                                                  submission.contractType
                                              ]
                                            : ''
                                    }
                                />
                            }
                            right={
                                <DataDetail
                                    id="contractEffectiveDates"
                                    label="Contract effective dates"
                                    data={`${dayjs(
                                        submission.contractDateStart
                                    ).format('MM/DD/YYYY')} - ${dayjs(
                                        submission.contractDateEnd
                                    ).format('MM/DD/YYYY')}`}
                                />
                            }
                        />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="managedCareEntities"
                                    label="Managed care entities"
                                    data={createCheckboxList({
                                        list: submission.managedCareEntities,
                                        dict: ManagedCareEntityRecord,
                                    })}
                                />
                            }
                            right={
                                <DataDetail
                                    id="federalAuthorities"
                                    label="Federal authority your program operates under"
                                    data={createCheckboxList({
                                        list: submission.federalAuthorities,
                                        dict: FederalAuthorityRecord,
                                    })}
                                />
                            }
                        />
                        {isContractAmendment &&
                            submission.contractAmendmentInfo && (
                                <>
                                    <DoubleColumnRow
                                        left={
                                            <DataDetail
                                                id="itemsAmended"
                                                label="Items being amended"
                                                data={createCheckboxList({
                                                    list: submission.contractAmendmentInfo.itemsBeingAmended.filter(
                                                        (item) =>
                                                            item !==
                                                                'CAPITATION_RATES' &&
                                                            item !== 'OTHER'
                                                    ),
                                                    dict: AmendableItemsRecord,
                                                    otherReasons: [
                                                        submission.contractAmendmentInfo.itemsBeingAmended.includes(
                                                            'CAPITATION_RATES'
                                                        )
                                                            ? capitationRateChangeReason()
                                                            : null,
                                                        submission
                                                            .contractAmendmentInfo
                                                            ?.otherItemBeingAmended
                                                            ? `Other (${submission.contractAmendmentInfo?.otherItemBeingAmended})`
                                                            : null,
                                                    ],
                                                })}
                                            />
                                        }
                                        right={
                                            <DataDetail
                                                id="covidRelated"
                                                label="Is this contract action related to the COVID-19 public health emergency"
                                                data={
                                                    submission
                                                        .contractAmendmentInfo
                                                        .relatedToCovid19
                                                        ? 'Yes'
                                                        : 'No'
                                                }
                                            />
                                        }
                                    />
                                    {submission.contractAmendmentInfo
                                        .relatedToCovid19 && (
                                        <DoubleColumnRow
                                            left={
                                                <DataDetail
                                                    id="vaccineRelated"
                                                    label="Is this related to coverage and reimbursement for vaccine administration?"
                                                    data={
                                                        submission
                                                            .contractAmendmentInfo
                                                            .relatedToVaccination
                                                            ? 'Yes'
                                                            : 'No'
                                                    }
                                                />
                                            }
                                        />
                                    )}
                                </>
                            )}
                    </dl>
                </section>
                {isContractActionAndRateCertification && (
                    <section id="rateDetails">
                        <dl>
                            <SectionHeader
                                header="Rate details"
                                to="rate-details"
                            />
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="rateType"
                                        label="Rate certification type"
                                        data={
                                            submission.rateAmendmentInfo
                                                ? 'Amendment to prior rate certification'
                                                : 'New rate certification'
                                        }
                                    />
                                }
                                right={
                                    <DataDetail
                                        id="ratingPeriod"
                                        label={
                                            submission.rateAmendmentInfo
                                                ? 'Rating period of original rate certification'
                                                : 'Rating period'
                                        }
                                        data={`${dayjs(
                                            submission.rateDateStart
                                        ).format('MM/DD/YYYY')} - ${dayjs(
                                            submission.rateDateEnd
                                        ).format('MM/DD/YYYY')}`}
                                    />
                                }
                            />
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="dateCertified"
                                        label={
                                            submission.rateAmendmentInfo
                                                ? 'Date certified for rate amendment'
                                                : 'Date certified'
                                        }
                                        data={dayjs(
                                            submission.rateDateCertified
                                        ).format('MM/DD/YYYY')}
                                    />
                                }
                                right={
                                    submission.rateAmendmentInfo ? (
                                        <DataDetail
                                            id="effectiveRatingPeriod"
                                            label="Effective dates of rate amendment"
                                            data={`${dayjs(
                                                submission.rateAmendmentInfo
                                                    .effectiveDateStart
                                            ).format('MM/DD/YYYY')} - ${dayjs(
                                                submission.rateAmendmentInfo
                                                    .effectiveDateEnd
                                            ).format('MM/DD/YYYY')}`}
                                        />
                                    ) : null
                                }
                            />
                        </dl>
                    </section>
                )}
                <section id="stateContacts" className={styles.reviewSection}>
                    <dl>
                        <SectionHeader header="State contacts" to="contacts" />

                        <GridContainer>
                            <Grid row>
                                {submission.stateContacts.map(
                                    (stateContact, index) => (
                                        <Grid
                                            col={6}
                                            key={'statecontact_' + index}
                                        >
                                            <strong>Contact {index + 1}</strong>
                                            <br />
                                            <address>
                                                {stateContact.name}
                                                <br />
                                                {stateContact.titleRole}
                                                <br />
                                                <a
                                                    href={`mailto:${stateContact.email}`}
                                                >
                                                    {stateContact.email}
                                                </a>
                                                <br />
                                            </address>
                                        </Grid>
                                    )
                                )}
                            </Grid>
                        </GridContainer>
                    </dl>
                    {isContractActionAndRateCertification && (
                        <dl>
                            <SectionHeader
                                header="Actuary contacts"
                                to="contacts"
                            />
                            <GridContainer>
                                <Grid row>
                                    {submission.actuaryContacts.map(
                                        (actuaryContact, index) => (
                                            <Grid
                                                col={6}
                                                key={'actuarycontact_' + index}
                                            >
                                                <span className="text-bold">
                                                    {index
                                                        ? 'Additional actuary contact'
                                                        : 'Certifying actuary'}
                                                </span>
                                                <br />
                                                <address>
                                                    {actuaryContact.name}
                                                    <br />
                                                    {actuaryContact.titleRole}
                                                    <br />
                                                    <a
                                                        href={`mailto:${actuaryContact.email}`}
                                                    >
                                                        {actuaryContact.email}
                                                    </a>
                                                    <br />
                                                    {actuaryContact.actuarialFirm ===
                                                    'OTHER' ? (
                                                        <>
                                                            {
                                                                actuaryContact.actuarialFirmOther
                                                            }
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/*TODO: make this more clear, a const or something */}
                                                            {actuaryContact.actuarialFirm
                                                                ? ActuaryFirmsRecord[
                                                                      actuaryContact
                                                                          .actuarialFirm
                                                                  ]
                                                                : ''}
                                                        </>
                                                    )}
                                                </address>
                                            </Grid>
                                        )
                                    )}
                                </Grid>
                                <Grid>
                                    <p>
                                        <span className="text-bold">
                                            Actuary communication preference
                                        </span>
                                        <br />
                                        {submission.actuaryCommunicationPreference
                                            ? ActuaryCommunicationRecord[
                                                  submission
                                                      .actuaryCommunicationPreference
                                              ]
                                            : ''}
                                    </p>
                                </Grid>
                            </GridContainer>
                        </dl>
                    )}
                </section>
                <section id="documents">
                    <SectionHeader header="Documents" to="documents" />
                    <span className="text-bold">{documentsSummary}</span>
                    <ul>
                        {refreshedDocs.map((doc) => (
                            <li key={doc.name}>
                                {doc.url ? (
                                    <Link
                                        aria-label={`${doc.name} (opens in new window)`}
                                        href={doc.url}
                                        variant="external"
                                        target="_blank"
                                    >
                                        {doc.name}
                                    </Link>
                                ) : (
                                    <span>{doc.name}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}

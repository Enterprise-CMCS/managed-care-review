import React, { useEffect, useState } from 'react'
import {
    Button,
    ButtonGroup,
    GridContainer,
    Grid,
    Link,
    Alert,
} from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import dayjs from 'dayjs'

import styles from './ReviewSubmit.module.scss'
import stylesForm from '../StateSubmissionForm.module.scss'

import { Dialog } from '../../../components/Dialog/Dialog'
import { SubmissionTypeSummary } from '../../../components/SubmissionSummary/submissionType'
import {
    DraftSubmission,
    Document,
    useSubmitDraftSubmissionMutation,
} from '../../../gen/gqlClient'
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
import { useS3 } from '../../../contexts/S3Context'
import { MCRouterState } from '../../../constants/routerState'

type DocumentWithLink = { url: string | null } & Document

const SectionHeader = ({
    header,
    to,
}: {
    header: string
    to: string
}): React.ReactElement => {
    return (
        <div className={styles.reviewSectionHeader}>
            <h2>{header}</h2>
            <div>
                <Link
                    variant="unstyled"
                    asCustom={NavLink}
                    className="usa-button usa-button--outline"
                    to={to}
                >
                    Edit <span className="srOnly">{header}</span>
                </Link>
            </div>
        </div>
    )
}

const SectionSubHeader = ({
    header,
}: {
    header: string
}): React.ReactElement => {
    return (
        <div className={styles.reviewSectionSubHeader}>
            <h2>{header}</h2>
        </div>
    )
}

export const ReviewSubmit = ({
    draftSubmission,
}: {
    draftSubmission: DraftSubmission
}): React.ReactElement => {
    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])
    const [displayConfirmation, setDisplayConfirmation] =
        useState<boolean>(false)
    const { getURL, getKey } = useS3()

    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const history = useHistory<MCRouterState>()
    const [submitDraftSubmission] = useSubmitDraftSubmissionMutation({
        // An alternative to messing with the cache like we do with create, just zero it out.
        update(cache, { data }) {
            if (data) {
                cache.modify({
                    id: 'ROOT_QUERY',
                    fields: {
                        indexSubmissions(_index, { DELETE }) {
                            return DELETE
                        },
                    },
                })
            }
        },
    })

    useEffect(() => {
        const refreshDocuments = async () => {
            const newDocs = await Promise.all(
                draftSubmission.documents.map(async (doc) => {
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
            ).catch((err) => {
                console.log(err)
                return []
            })
            setRefreshedDocs(newDocs)
        }

        void refreshDocuments()
    }, [draftSubmission.documents, getKey, getURL])

    const documentsSummary = `${draftSubmission.documents.length} ${
        draftSubmission.documents.length === 1 ? 'file' : 'files'
    }`

    const showError = (error: string) => {
        setUserVisibleError(error)
    }

    const handleSubmitConfirmation = () => {
        console.log('Confirmation Button Presssed')
        setDisplayConfirmation(true)
    }

    const handleCancelSubmitConfirmation = () => {
        console.log('cancel sub comf')
        setDisplayConfirmation(false)
    }

    const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()

        try {
            const data = await submitDraftSubmission({
                variables: {
                    input: {
                        submissionID: draftSubmission.id,
                    },
                },
            })

            console.log('Got data: ', data)

            if (data.errors) {
                console.log(data.errors)
                showError('Error attempting to submit. Please try again.')
                setDisplayConfirmation(false)
            }

            if (data.data?.submitDraftSubmission) {
                history.push(`/dashboard?justSubmitted=${draftSubmission.name}`)
            }
        } catch (error) {
            console.log(error)
            showError('Error attempting to submit. Please try again.')
            setDisplayConfirmation(false)
        }
    }

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
            draftSubmission?.contractAmendmentInfo
                ?.capitationRatesAmendedInfo || {}
        if (!reason) return null

        return otherReason
            ? `${AmendableItemsRecord['CAPITATION_RATES']} (${otherReason})`
            : `${AmendableItemsRecord['CAPITATION_RATES']} (${RateChangeReasonRecord[reason]})`
    }

    const isContractAmendment = draftSubmission.contractType === 'AMENDMENT'
    const isContractActionAndRateCertification =
        draftSubmission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            {userVisibleError && (
                <Alert type="error" heading="Submission Error">
                    {userVisibleError}
                </Alert>
            )}

            <SubmissionTypeSummary submission={draftSubmission} />

            <section id="contractDetails" className={styles.reviewSection}>
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
                                    draftSubmission.contractType
                                        ? ContractTypeRecord[
                                              draftSubmission.contractType
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
                                    draftSubmission.contractDateStart
                                ).format('MM/DD/YYYY')} - ${dayjs(
                                    draftSubmission.contractDateEnd
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
                                    list: draftSubmission.managedCareEntities,
                                    dict: ManagedCareEntityRecord,
                                })}
                            />
                        }
                        right={
                            <DataDetail
                                id="federalAuthorities"
                                label="Federal authority your program operates under"
                                data={createCheckboxList({
                                    list: draftSubmission.federalAuthorities,
                                    dict: FederalAuthorityRecord,
                                })}
                            />
                        }
                    />
                    {isContractAmendment &&
                        draftSubmission.contractAmendmentInfo && (
                            <>
                                <DoubleColumnRow
                                    left={
                                        <DataDetail
                                            id="itemsAmended"
                                            label="Items being amended"
                                            data={createCheckboxList({
                                                list: draftSubmission.contractAmendmentInfo.itemsBeingAmended.filter(
                                                    (item) =>
                                                        item !==
                                                            'CAPITATION_RATES' &&
                                                        item !== 'OTHER'
                                                ),
                                                dict: AmendableItemsRecord,
                                                otherReasons: [
                                                    draftSubmission.contractAmendmentInfo.itemsBeingAmended.includes(
                                                        'CAPITATION_RATES'
                                                    )
                                                        ? capitationRateChangeReason()
                                                        : null,
                                                    draftSubmission
                                                        .contractAmendmentInfo
                                                        ?.otherItemBeingAmended
                                                        ? `Other (${draftSubmission.contractAmendmentInfo?.otherItemBeingAmended})`
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
                                                draftSubmission
                                                    .contractAmendmentInfo
                                                    .relatedToCovid19
                                                    ? 'Yes'
                                                    : 'No'
                                            }
                                        />
                                    }
                                />
                                {draftSubmission.contractAmendmentInfo
                                    .relatedToCovid19 && (
                                    <DoubleColumnRow
                                        left={
                                            <DataDetail
                                                id="vaccineRelated"
                                                label="Is this related to coverage and reimbursement for vaccine administration?"
                                                data={
                                                    draftSubmission
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
                <section id="rateDetails" className={styles.reviewSection}>
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
                                        draftSubmission.rateAmendmentInfo
                                            ? 'Amendment to prior rate certification'
                                            : 'New rate certification'
                                    }
                                />
                            }
                            right={
                                <DataDetail
                                    id="ratingPeriod"
                                    label={
                                        draftSubmission.rateAmendmentInfo
                                            ? 'Rating period of original rate certification'
                                            : 'Rating period'
                                    }
                                    data={`${dayjs(
                                        draftSubmission.rateDateStart
                                    ).format('MM/DD/YYYY')} - ${dayjs(
                                        draftSubmission.rateDateEnd
                                    ).format('MM/DD/YYYY')}`}
                                />
                            }
                        />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="dateCertified"
                                    label={
                                        draftSubmission.rateAmendmentInfo
                                            ? 'Date certified for rate amendment'
                                            : 'Date certified'
                                    }
                                    data={dayjs(
                                        draftSubmission.rateDateCertified
                                    ).format('MM/DD/YYYY')}
                                />
                            }
                            right={
                                draftSubmission.rateAmendmentInfo ? (
                                    <DataDetail
                                        id="effectiveRatingPeriod"
                                        label="Effective dates of rate amendment"
                                        data={`${dayjs(
                                            draftSubmission.rateAmendmentInfo
                                                .effectiveDateStart
                                        ).format('MM/DD/YYYY')} - ${dayjs(
                                            draftSubmission.rateAmendmentInfo
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
                            {draftSubmission.stateContacts.map(
                                (stateContact, index) => (
                                    <Grid col={6} key={'statecontact_' + index}>
                                        <span className="text-bold">
                                            Contact {index + 1}
                                        </span>
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
                    <>
                        <dl>
                            <SectionSubHeader header="Actuary contacts" />
                            <GridContainer>
                                <Grid row>
                                    {draftSubmission.actuaryContacts.map(
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
                            </GridContainer>
                        </dl>
                        <dl>
                            <GridContainer>
                                <Grid row>
                                    <span className="text-bold">
                                        Actuary communication preference
                                    </span>
                                    {draftSubmission.actuaryCommunicationPreference
                                        ? ActuaryCommunicationRecord[
                                              draftSubmission
                                                  .actuaryCommunicationPreference
                                          ]
                                        : ''}
                                </Grid>
                            </GridContainer>
                        </dl>
                    </>
                )}
            </section>

            <section id="documents" className={styles.reviewSection}>
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

            <div className={stylesForm.pageActions}>
                <Link
                    asCustom={NavLink}
                    className="usa-button usa-button--unstyled"
                    variant="unstyled"
                    to={{
                        pathname: '/dashboard',
                        state: { defaultProgramID: draftSubmission.programID },
                    }}
                >
                    Save as draft
                </Link>
                <ButtonGroup type="default" className={stylesForm.buttonGroup}>
                    <Link
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        variant="unstyled"
                        to="documents"
                    >
                        Back
                    </Link>
                    <Button
                        type="button"
                        className={styles.submitButton}
                        data-testid="pageSubmitButton"
                        onClick={handleSubmitConfirmation}
                    >
                        Submit
                    </Button>
                </ButtonGroup>

                {displayConfirmation && (
                    <Dialog
                        heading="Ready to submit?"
                        actions={[
                            <Button
                                type="button"
                                key="cancelButton"
                                outline
                                onClick={handleCancelSubmitConfirmation}
                            >
                                Cancel
                            </Button>,
                            <Button
                                type="button"
                                key="submitButton"
                                aria-label="Confirm submit"
                                className={styles.submitButton}
                                onClick={handleFormSubmit}
                            >
                                Submit
                            </Button>,
                        ]}
                    >
                        <p>
                            Submitting this package will send it to CMS to begin
                            their review.
                        </p>
                    </Dialog>
                )}
            </div>
        </GridContainer>
    )
}

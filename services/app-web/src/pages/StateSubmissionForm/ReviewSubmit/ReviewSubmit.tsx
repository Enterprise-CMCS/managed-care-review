import React, { useEffect, useState } from 'react'
import { GridContainer, Grid, Link, Alert } from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'

import styles from './ReviewSubmit.module.scss'
import stylesForm from '../StateSubmissionForm.module.scss'

import {
    DraftSubmission,
    Document,
    useSubmitDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import { DataDetail } from '../../../components/DataDetail/DataDetail'
import { DoubleColumnRow } from '../../../components/DoubleColumnRow/DoubleColumnRow'
import { PageActions } from '../PageActions'
import { SubmissionTypeRecord } from '../../../constants/submissions'
import { useS3 } from '../../../contexts/S3Context'

type DocumentWithLink = { url: string | null } & Document
export const ReviewSubmit = ({
    draftSubmission,
}: {
    draftSubmission: DraftSubmission
}): React.ReactElement => {
    const [refreshedDocs, setRefreshedDocs] = useState<DocumentWithLink[]>([])
    const { getURL, getKey } = useS3()

    const [userVisibleError, setUserVisibleError] = useState<
        string | undefined
    >(undefined)
    const history = useHistory()
    const [submitDraftSubmission] = useSubmitDraftSubmissionMutation()

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
                        className={`${stylesForm.outlineButtonLink} usa-button usa-button--outline`}
                        to={to}
                    >
                        Edit <span className="srOnly">{header}</span>
                    </Link>
                </div>
            </div>
        )
    }
    const documentsSummary = `${draftSubmission.documents.length} ${
        draftSubmission.documents.length === 1 ? 'file' : 'files'
    }`

    const showError = (error: string) => {
        setUserVisibleError(error)
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

            if (data.errors) {
                console.log(data.errors)
                showError('Error attempting to submit. Please try again.')
            }

            if (data.data?.submitDraftSubmission) {
                history.push(`/dashboard?justSubmitted=${draftSubmission.name}`)
            }
        } catch (error) {
            console.log(error)
            showError('Error attempting to submit. Please try again.')
        }
    }

    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            {userVisibleError && (
                <Alert type="error" heading="Submission Error">
                    {userVisibleError}
                </Alert>
            )}
            <Grid row>
                <Grid col={12} tablet={{ col: 8, offset: 2 }}>
                    <section
                        id="submissionType"
                        className={styles.reviewSection}
                    >
                        <div className={styles.reviewSectionHeader}>
                            <h2 className={styles.submissionName}>
                                {draftSubmission.name}
                            </h2>
                            <div>
                                <Link
                                    asCustom={NavLink}
                                    to="type"
                                    className={`${stylesForm.outlineButtonLink} usa-button usa-button--outline`}
                                    variant="unstyled"
                                >
                                    Edit
                                    <span className="srOnly">
                                        Submission type
                                    </span>
                                </Link>
                            </div>
                        </div>
                        <dl>
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="program"
                                        label="Program"
                                        data={draftSubmission.program.name}
                                    />
                                }
                                right={
                                    <DataDetail
                                        id="submissionType"
                                        label="Submission type"
                                        data={
                                            SubmissionTypeRecord[
                                                draftSubmission.submissionType
                                            ]
                                        }
                                    />
                                }
                            />
                            <Grid row gap className={styles.reviewDataRow}>
                                <Grid col={12}>
                                    <DataDetail
                                        id="submissionDescription"
                                        label="Submission description"
                                        data={
                                            draftSubmission.submissionDescription
                                        }
                                    />
                                </Grid>
                            </Grid>
                        </dl>
                    </section>
                    <section
                        id="contractDetails"
                        className={styles.reviewSection}
                    >
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
                                        data="Amendment to base contract"
                                    />
                                }
                                right={
                                    <DataDetail
                                        id="contractEffectiveDates"
                                        label="Contract effective dates"
                                        data="07/01/2020 - 06/30/2021"
                                    />
                                }
                            />
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="managedCareEntities"
                                        label="Managed care entities"
                                        data="Managed Care Organization (MCO)"
                                    />
                                }
                                right={
                                    <DataDetail
                                        id="itemsAmended"
                                        label="Items being amended"
                                        data="Benefits provided, Capitation rates (Updates based on more recent data)"
                                    />
                                }
                            />
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="federalOperatingAuth"
                                        label="Federal authority your program operates under"
                                        data="1115 waiver"
                                    />
                                }
                                right={
                                    <DataDetail
                                        id="covidRelated"
                                        label="Is this contract action related to the COVID-19 public health emergency"
                                        data="Yes"
                                    />
                                }
                            />
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="vaccineRelated"
                                        label="Is this related to coverage and reimbursement for vaccine administration?"
                                        data="Yes"
                                    />
                                }
                            />
                        </dl>
                    </section>
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
                                        data="New rate certification"
                                    />
                                }
                                right={
                                    <DataDetail
                                        id="ratingPeriod"
                                        label="Rating period"
                                        data="07/01/2020 - 06/30/2021"
                                    />
                                }
                            />
                            <DoubleColumnRow
                                left={
                                    <DataDetail
                                        id="dateCertified"
                                        label="Date certified"
                                        data="06/03/2021"
                                    />
                                }
                            />
                        </dl>
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
                    <PageActions
                        secondaryAction="Back"
                        primaryAction="Submit"
                        primaryActionCallback={handleFormSubmit}
                    />
                </Grid>
            </Grid>
        </GridContainer>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}

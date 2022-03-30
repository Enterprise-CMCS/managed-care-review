import React, { useEffect, useState } from 'react'
import { Alert, GridContainer } from '@trussworks/react-uswds'
import { useLocation, useParams } from 'react-router-dom'
import {
    submissionName,
    SubmissionUnionType,
    UpdateInfoType,
} from '../../common-code/domain-models'
import { base64ToDomain } from '../../common-code/proto/stateSubmission'
import { Loading } from '../../components/Loading'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
    SupportingDocumentsSummarySection,
} from '../../components/SubmissionSummarySection'
import { usePage } from '../../contexts/PageContext'
import { useFetchSubmission2Query } from '../../gen/gqlClient'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404'
import { dayjs } from '../../dateHelpers'
import styles from './SubmissionRevisionSummary.module.scss'
import { convertDomainModelFormDataToGQLSubmission } from '../../gqlHelpers'

export const SubmissionRevisionSummary = (): React.ReactElement => {
    // Page level state
    const { id, revisionVersion } =
        useParams<{ id: string; revisionVersion: string }>()
    const { pathname } = useLocation()
    const { updateHeading } = usePage()
    const [pageLevelAlert, setPageLevelAlert] = useState<string | undefined>(
        undefined
    )
    const [submitInfo, setSubmitInfo] = useState<UpdateInfoType | undefined>(
        undefined
    )

    // Api fetched data state
    const [packageData, setPackageData] = useState<
        SubmissionUnionType | undefined
    >(undefined)

    const { loading, error, data } = useFetchSubmission2Query({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const submissionAndRevisions = data?.fetchSubmission2.submission

    // Pull out the correct revision form api request, display errors for bad dad
    useEffect(() => {
        //Find revision by revisionVersion.
        if (submissionAndRevisions) {
            const revision = [...submissionAndRevisions.revisions]
                .reverse() //Reversing revisions to get correct submission order
                .find((revision, index) => index === Number(revisionVersion))

            if (!revision) {
                console.error(
                    'ERROR: submission in summary has no submitted revision',
                    submissionAndRevisions.revisions
                )
                setPageLevelAlert(
                    'Error fetching the submission. Please try again.'
                )
                return
            }

            const submissionResult = base64ToDomain(
                revision.revision.submissionData
            )

            if (
                submissionResult instanceof Error ||
                !revision.revision.submitInfo
            ) {
                console.error(
                    'ERROR: got a proto decoding error',
                    submissionResult
                )
                setPageLevelAlert(
                    'Error fetching the submission. Please try again.'
                )
                return
            }
            setSubmitInfo(revision.revision.submitInfo)
            setPackageData(submissionResult)
        }
    }, [
        submissionAndRevisions,
        revisionVersion,
        setPackageData,
        setPageLevelAlert,
    ])

    // Update header with submission name
    useEffect(() => {
        const subWithRevisions = data?.fetchSubmission2.submission
        if (packageData && subWithRevisions) {
            const programs = subWithRevisions.state.programs
            updateHeading(pathname, submissionName(packageData, programs))
        }
    }, [updateHeading, pathname, packageData, data])

    if (loading || !submissionAndRevisions || !packageData) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (data && !submissionAndRevisions) return <Error404 /> // api request resolves but are no revisions likely because invalid submission is queried. This should be "Not Found"
    if (error || !packageData || !submissionAndRevisions)
        return <GenericErrorPage /> // api failure or protobuf decode failure

    const statePrograms = submissionAndRevisions.state.programs

    // temporary kludge while the display data is expecting the wrong format.
    // This is turning our domain model into the GraphQL model which is what
    // all our frontend stuff expects right now.
    const submission = convertDomainModelFormDataToGQLSubmission(
        packageData,
        statePrograms
    )

    const isContractActionAndRateCertification =
        submission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {pageLevelAlert && (
                    <Alert type="error" heading="Unlock Error">
                        {pageLevelAlert}
                    </Alert>
                )}

                <SubmissionTypeSummarySection
                    submission={submission}
                    statePrograms={statePrograms}
                    showLastUpdated={false}
                    headerChildComponent={
                        submitInfo && (
                            <p className={styles.submissionVersion}>
                                {`${dayjs
                                    .utc(submitInfo?.updatedAt)
                                    .tz('America/New_York')
                                    .format('MM/DD/YY h:mma z')} ET version`}
                            </p>
                        )
                    }
                />

                <ContractDetailsSummarySection submission={submission} />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection submission={submission} />
                )}

                <ContactsSummarySection submission={submission} />

                <SupportingDocumentsSummarySection submission={submission} />
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}

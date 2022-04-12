import React, { useEffect, useState } from 'react'
import { Alert, GridContainer } from '@trussworks/react-uswds'
import { useLocation, useParams } from 'react-router-dom'
import {
    submissionName,
    HealthPlanFormDataType,
    UpdateInfoType,
} from '../../common-code/domain-models'
import { makeDateTable } from '../../common-code/data-helpers/makeDocumentDateLookupTable'
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
import { PreviousSubmissionBanner } from '../../components'
import { DocumentDateLookupTable } from '../SubmissionSummary/SubmissionSummary'

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
        HealthPlanFormDataType | undefined
    >(undefined)

    // document date lookup state
    const [documentDates, setDocumentDates] = useState<
        DocumentDateLookupTable | undefined
    >({})

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
            const lookupTable = makeDateTable(submissionAndRevisions)
            setDocumentDates(lookupTable)
            //We offset version by +1 of index, remove offset to find revision in revisions
            const revisionIndex = Number(revisionVersion) - 1
            const revision = [...submissionAndRevisions.revisions]
                .reverse() //Reversing revisions to get correct submission order
                .find((revision, index) => index === revisionIndex)

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
            console.log('submissionResult', submissionResult)
            console.log(
                'revision.revision.submitInfo',
                revision.revision.submitInfo
            )
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

                <PreviousSubmissionBanner link={`/submissions/${id}`} />

                <SubmissionTypeSummarySection
                    submission={submission}
                    statePrograms={statePrograms}
                    headerChildComponent={
                        submitInfo && (
                            <p
                                className={styles.submissionVersion}
                                data-testid="revision-version"
                            >
                                {`${dayjs
                                    .utc(submitInfo?.updatedAt)
                                    .tz('America/New_York')
                                    .format('MM/DD/YY h:mma')} ET version`}
                            </p>
                        )
                    }
                />

                <ContractDetailsSummarySection
                    submission={submission}
                    documentDateLookupTable={documentDates}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        submission={submission}
                        documentDateLookupTable={documentDates}
                    />
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

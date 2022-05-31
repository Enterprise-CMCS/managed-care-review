import React, { useEffect, useState } from 'react'
import { Alert, GridContainer } from '@trussworks/react-uswds'
import { useParams } from 'react-router-dom'
import {
    packageName,
    HealthPlanFormDataType,
} from '../../common-code/healthPlanFormDataType'
import { makeDateTable } from '../../documentHelpers/makeDocumentDateLookupTable'
import { base64ToDomain } from '../../common-code/proto/healthPlanFormDataProto'
import { Loading } from '../../components/Loading'
import {
    ContactsSummarySection,
    ContractDetailsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
    SupportingDocumentsSummarySection,
} from '../../components/SubmissionSummarySection'
import { usePage } from '../../contexts/PageContext'
import {
    UpdateInformation,
    useFetchHealthPlanPackageQuery,
} from '../../gen/gqlClient'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404'
import { dayjs } from '../../common-code/dateHelpers'
import styles from './SubmissionRevisionSummary.module.scss'
import { PreviousSubmissionBanner } from '../../components'
import { DocumentDateLookupTable } from '../SubmissionSummary/SubmissionSummary'

export const SubmissionRevisionSummary = (): React.ReactElement => {
    // Page level state
    const { id, revisionVersion } = useParams<{
        id: string
        revisionVersion: string
    }>()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { updateHeading } = usePage()
    const [pageLevelAlert, setPageLevelAlert] = useState<string | undefined>(
        undefined
    )
    const [submitInfo, setSubmitInfo] = useState<UpdateInformation | undefined>(
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

    const { loading, error, data } = useFetchHealthPlanPackageQuery({
        variables: {
            input: {
                pkgID: id,
            },
        },
    })

    const submissionAndRevisions = data?.fetchHealthPlanPackage.pkg

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
                .find((_revision, index) => index === revisionIndex)

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

            const submissionResult = base64ToDomain(revision.node.formDataProto)

            if (
                submissionResult instanceof Error ||
                !revision.node.submitInfo
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
            console.log('revision.node.submitInfo', revision.node.submitInfo)
            setSubmitInfo(revision.node.submitInfo)
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
        const subWithRevisions = data?.fetchHealthPlanPackage.pkg
        if (packageData && subWithRevisions) {
            const programs = subWithRevisions.state.programs
            updateHeading({ customHeading: packageName(packageData, programs) })
        }
    }, [updateHeading, packageData, data])

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

    const isContractActionAndRateCertification =
        packageData.submissionType === 'CONTRACT_AND_RATES'

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
                    submission={packageData}
                    statePrograms={statePrograms}
                    submissionName={packageName(packageData, statePrograms)}
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
                    submission={packageData}
                    documentDateLookupTable={documentDates}
                    submissionName={packageName(packageData, statePrograms)}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        submission={packageData}
                        documentDateLookupTable={documentDates}
                        submissionName={packageName(packageData, statePrograms)}
                    />
                )}

                <ContactsSummarySection submission={packageData} />

                <SupportingDocumentsSummarySection submission={packageData} />
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}

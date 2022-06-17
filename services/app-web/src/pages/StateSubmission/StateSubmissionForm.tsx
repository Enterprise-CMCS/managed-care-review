import React, { useState, useEffect } from 'react'

import { Alert, GridContainer } from '@trussworks/react-uswds'
import { Routes, Route, useParams } from 'react-router-dom'
import styles from './StateSubmissionForm.module.scss'

import { Error404 } from '../Errors/Error404'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatus'

import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Loading } from '../../components/Loading'
import { DynamicStepIndicator } from '../../components/DynamicStepIndicator'
import { usePage } from '../../contexts/PageContext'
import {
    STATE_SUBMISSION_FORM_ROUTES,
    RouteT,
    RoutesRecord,
} from '../../constants/routes'
import { getRelativePath } from '../../routeHelpers'
import { getCurrentRevisionFromHealthPlanPackage } from '../../gqlHelpers'
import { StateSubmissionContainer } from './StateSubmissionContainer'
import { ContractDetails } from './ContractDetails'
import { RateDetails } from './RateDetails'
import { Contacts } from './Contacts'
import { Documents } from './Documents'
import { ReviewSubmit } from './ReviewSubmit'
import { SubmissionType } from './SubmissionType'

import {
    useFetchHealthPlanPackageQuery,
    User,
    useUpdateHealthPlanFormDataMutation,
    HealthPlanPackage,
    UpdateInformation,
} from '../../gen/gqlClient'
import { SubmissionUnlockedBanner } from '../../components/Banner'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import {
    UnlockedHealthPlanFormDataType,
    packageName,
} from '../../common-code/healthPlanFormDataType'
import { domainToBase64 } from '../../common-code/proto/healthPlanFormDataProto'
import { makeDocumentList } from '../../documentHelpers/makeDocumentKeyLookupList'
import { makeDateTable } from '../../documentHelpers/makeDocumentDateLookupTable'
import { DocumentDateLookupTable } from '../SubmissionSummary/SubmissionSummary'
import { recordJSException } from '../../otelHelpers/tracingHelper'

const getRelativePathFromNestedRoute = (formRouteType: RouteT): string =>
    getRelativePath({
        basePath: RoutesRecord.SUBMISSIONS_FORM,
        targetPath: RoutesRecord[formRouteType],
    })

const FormAlert = ({ message }: { message?: string }): React.ReactElement => {
    return message ? (
        <Alert type="error">{message}</Alert>
    ) : (
        <GenericApiErrorBanner />
    )
}

const PageBannerAlerts = ({
    showPageErrorMessage,
    loggedInUser,
    unlockedInfo,
}: {
    showPageErrorMessage: string | boolean
    loggedInUser?: User
    unlockedInfo?: UpdateInformation | null
}): JSX.Element => {
    const message =
        typeof showPageErrorMessage !== 'boolean'
            ? showPageErrorMessage
            : undefined
    return (
        <>
            {showPageErrorMessage && <FormAlert message={message} />}
            {unlockedInfo && (
                <SubmissionUnlockedBanner
                    userType={
                        loggedInUser?.role === 'CMS_USER'
                            ? 'CMS_USER'
                            : 'STATE_USER'
                    }
                    unlockedBy={unlockedInfo?.updatedBy || 'Not available'}
                    unlockedOn={unlockedInfo.updatedAt || 'Not available'}
                    reason={unlockedInfo.updatedReason || 'Not available'}
                />
            )}
        </>
    )
}

const activeFormPages = (draft: UnlockedHealthPlanFormDataType): RouteT[] => {
    // If submission type is contract only, rate details is left out of the step indicator
    return STATE_SUBMISSION_FORM_ROUTES.filter(
        (formPage) =>
            !(
                draft?.submissionType === 'CONTRACT_ONLY' &&
                formPage === 'SUBMISSIONS_RATE_DETAILS'
            )
    )
}
type FormDataError =
    | 'NOT_FOUND'
    | 'MALFORMATTED_DATA'
    | 'WRONG_SUBMISSION_STATUS'

/* 
    Prep work for refactor of form pages.  This should be pulled out into a HealthPlanFormPageContext or HOC.
    We have several instances of shared state across pages. 
*/

export type HealthPlanFormPageProps = {
    draftSubmission: UnlockedHealthPlanFormDataType
    showValidations?: boolean
    previousDocuments: string[]
    updateDraft: (
        input: UnlockedHealthPlanFormDataType
    ) => Promise<HealthPlanPackage | Error>
}
export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    // IF not id throw new error
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { currentRoute } = useCurrentRoute()
    const { updateHeading } = usePage()

    const [formDataFromLatestRevision, setFormDataFromLatestRevision] =
        useState<UnlockedHealthPlanFormDataType | null>(null)
    const [formDataError, setFormDataError] = useState<FormDataError | null>(
        null
    )
    const { loggedInUser } = useAuth()
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic of true
    const [unlockedInfo, setUnlockedInfo] = useState<UpdateInformation | null>(
        null
    )
    const [computedSubmissionName, setComputedSubmissionName] =
        useState<string>('')
    const [previousDocuments, setPreviousDocuments] = useState<string[]>([])

    // document date lookup state
    const [documentDates, setDocumentDates] = useState<
        DocumentDateLookupTable | undefined
    >({})

    // Set up graphql calls
    const {
        data: fetchData,
        loading: fetchLoading,
        error: fetchError,
    } = useFetchHealthPlanPackageQuery({
        variables: {
            input: {
                pkgID: id,
            },
        },
    })

    const submissionAndRevisions = fetchData?.fetchHealthPlanPackage?.pkg
    const [updateFormData, { error: updateFormDataError }] =
        useUpdateHealthPlanFormDataMutation()

    // When the new API is done, we'll call the new API here
    const updateDraftHealthPlanPackage = async (
        input: UnlockedHealthPlanFormDataType
    ): Promise<HealthPlanPackage | Error> => {
        const base64Draft = domainToBase64(input)

        setShowPageErrorMessage(false)
        try {
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        pkgID: input.id,
                        healthPlanFormData: base64Draft,
                    },
                },
            })
            const updatedSubmission: HealthPlanPackage | undefined =
                updateResult?.data?.updateHealthPlanFormData.pkg

            if (!updatedSubmission) {
                setShowPageErrorMessage(true)
                console.log('Failed to update form data', updateResult)
                return new Error('Failed to update form data')
            }

            return updatedSubmission
        } catch (serverError) {
            setShowPageErrorMessage(true)
            return serverError
        }
    }

    // Setup side effects
    useEffect(() => {
        if (formDataFromLatestRevision) {
            const statePrograms =
                (loggedInUser &&
                    'state' in loggedInUser &&
                    loggedInUser.state.programs) ||
                []
            const name = packageName(formDataFromLatestRevision, statePrograms)
            setComputedSubmissionName(name)
            updateHeading({ customHeading: name })
        }
    }, [updateHeading, formDataFromLatestRevision, loggedInUser])

    useEffect(() => {
        if (submissionAndRevisions) {
            const currentRevisionPackageOrError =
                getCurrentRevisionFromHealthPlanPackage(submissionAndRevisions)

            // set form data
            if (currentRevisionPackageOrError instanceof Error) {
                setFormDataError('MALFORMATTED_DATA')
                return
            }

            const [revision, planFormData] = currentRevisionPackageOrError

            if (planFormData.status !== 'DRAFT') {
                recordJSException(
                    `StateSubmissionForm: WRONG_SUBMISSION_STATUS. ID:
                ${submissionAndRevisions.id}`
                )
                setFormDataError('WRONG_SUBMISSION_STATUS')
                return
            }

            setFormDataFromLatestRevision(planFormData)

            //set previous submitted files
            const documentList = makeDocumentList(submissionAndRevisions)
            //set document dates
            const documentDates = makeDateTable(submissionAndRevisions)
            setDocumentDates(documentDates)
            if (documentList instanceof Error) {
                recordJSException(
                    `StateSubmissionForm: MALFORMATTED_DATA. document list malformatted. ID:
                    ${submissionAndRevisions.id} Error message: ${documentList.message}`
                )
                setFormDataError('MALFORMATTED_DATA')
                return
            }
            setPreviousDocuments(documentList.previousDocuments)

            // set unlock info
            if (submissionAndRevisions.status === 'UNLOCKED') {
                const unlockInfo = revision.unlockInfo

                if (unlockInfo) {
                    setUnlockedInfo({
                        updatedBy: unlockInfo.updatedBy,
                        updatedAt: unlockInfo.updatedAt,
                        updatedReason: unlockInfo.updatedReason,
                    })
                } else {
                    recordJSException(
                        `StateSubmissionForm: submission in summary has no revision with unlocked information. ID:
                        ${submissionAndRevisions.id}`
                    )
                    setShowPageErrorMessage(
                        'This may be an unlocked submission that is currently being edited. Please reload the page and try again.'
                    )
                }
            }
        }
    }, [submissionAndRevisions])

    if (updateFormDataError && !showPageErrorMessage) {
        // This triggers if Apollo sets the error from our useQuery invocation
        // we should already be setting this in our try {} block in the actual update handler, I think
        // so this might be worth looking into.
        recordJSException(
            `StateSubmissionForm: Apollo error reported. Error message: ${updateFormDataError.message}`
        )
        setShowPageErrorMessage(true)
    }

    if (fetchError) {
        // This is a sign that we are handling the same error handling logic frontend and backend around invalid status
        let specificContent: React.ReactElement | undefined = undefined
        fetchError.graphQLErrors.forEach((err) => {
            if (err?.extensions?.code === 'WRONG_STATUS') {
                if (
                    currentRoute !== 'UNKNOWN_ROUTE' &&
                    STATE_SUBMISSION_FORM_ROUTES.includes(currentRoute)
                ) {
                    specificContent = <ErrorInvalidSubmissionStatus />
                }
            }
        })
        return specificContent ?? <GenericErrorPage />
    }
    if (
        (fetchData && formDataError === 'NOT_FOUND') ||
        (fetchData && !formDataFromLatestRevision)
    ) {
        return <Error404 />
    }

    if (formDataError === 'MALFORMATTED_DATA') {
        return <GenericErrorPage />
    }

    if (formDataError === 'WRONG_SUBMISSION_STATUS') {
        return <ErrorInvalidSubmissionStatus />
    }
    // order matters, this should be last to prevent 404 flicker
    if (fetchLoading || !formDataFromLatestRevision) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    return (
        <>
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={activeFormPages(formDataFromLatestRevision)}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockedInfo}
                    showPageErrorMessage={showPageErrorMessage}
                />
            </div>
            <StateSubmissionContainer>
                <Routes>
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_TYPE'
                        )}
                        element={
                            <SubmissionType
                                draftSubmission={formDataFromLatestRevision}
                                updateDraft={updateDraftHealthPlanPackage}
                            />
                        }
                    />
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_CONTRACT_DETAILS'
                        )}
                        element={
                            <ContractDetails
                                draftSubmission={formDataFromLatestRevision}
                                updateDraft={updateDraftHealthPlanPackage}
                                previousDocuments={previousDocuments}
                            />
                        }
                    />
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_RATE_DETAILS'
                        )}
                        element={
                            <RateDetails
                                draftSubmission={formDataFromLatestRevision}
                                updateDraft={updateDraftHealthPlanPackage}
                                previousDocuments={previousDocuments}
                            />
                        }
                    />
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_CONTACTS'
                        )}
                        element={
                            <Contacts
                                draftSubmission={formDataFromLatestRevision}
                                updateDraft={updateDraftHealthPlanPackage}
                            />
                        }
                    />
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_DOCUMENTS'
                        )}
                        element={
                            <Documents
                                draftSubmission={formDataFromLatestRevision}
                                updateDraft={updateDraftHealthPlanPackage}
                                previousDocuments={previousDocuments}
                            />
                        }
                    />
                    <Route
                        path={getRelativePathFromNestedRoute(
                            'SUBMISSIONS_REVIEW_SUBMIT'
                        )}
                        element={
                            <ReviewSubmit
                                draftSubmission={formDataFromLatestRevision}
                                unlocked={!!unlockedInfo}
                                submissionName={computedSubmissionName}
                                documentDateLookupTable={documentDates}
                            />
                        }
                    />
                    <Route path="*" element={<Error404 />} />
                </Routes>
            </StateSubmissionContainer>
        </>
    )
}

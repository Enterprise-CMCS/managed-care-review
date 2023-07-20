import React, { useEffect, useState } from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { Routes, Route, useParams } from 'react-router-dom'
import styles from './StateSubmissionForm.module.scss'

import { Error404 } from '../Errors/Error404Page'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatusPage'
import {
    User,
    HealthPlanPackage,
    UpdateInformation,
    useUpdateHealthPlanFormDataMutation,
} from '../../gen/gqlClient'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Loading } from '../../components/Loading'
import { DynamicStepIndicator } from '../../components/DynamicStepIndicator'
import { usePage } from '../../contexts/PageContext'
import {
    STATE_SUBMISSION_FORM_ROUTES,
    RouteT,
    RouteTWithUnknown,
    RoutesRecord,
} from '../../constants/routes'
import { getRelativePath } from '../../routeHelpers'
import { useFetchHealthPlanPackageWrapper } from '../../gqlHelpers'
import { StateSubmissionContainer } from './StateSubmissionContainer'
import { ContractDetails } from './ContractDetails'
import { RateDetails } from './RateDetails'
import { Contacts } from './Contacts'
import { Documents } from './Documents'
import { ReviewSubmit } from './ReviewSubmit'
import { SubmissionType } from './SubmissionType'
import { SubmissionUnlockedBanner } from '../../components/Banner'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import {
    UnlockedHealthPlanFormDataType,
    packageName,
} from '../../common-code/healthPlanFormDataType'
import { domainToBase64 } from '../../common-code/proto/healthPlanFormDataProto'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import { useStatePrograms } from '../../hooks/useStatePrograms'
import { ApolloError } from '@apollo/client'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import {
    makeDocumentS3KeyLookup,
    makeDocumentDateTable,
} from '../../documentHelpers'

const getRelativePathFromNestedRoute = (formRouteType: RouteT): string =>
    getRelativePath({
        basePath: RoutesRecord.SUBMISSIONS_FORM,
        targetPath: RoutesRecord[formRouteType],
    })

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
            {showPageErrorMessage && (
                <GenericApiErrorBanner message={message} />
            )}
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

const activeFormPages = (
    draft: UnlockedHealthPlanFormDataType
): RouteTWithUnknown[] => {
    // If submission type is contract only, rate details is left out of the step indicator
    return STATE_SUBMISSION_FORM_ROUTES.filter(
        (formPage) =>
            !(
                draft?.submissionType === 'CONTRACT_ONLY' &&
                formPage === 'SUBMISSIONS_RATE_DETAILS'
            )
    )
}

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
    const [pkgNameForHeading, setPkgNameForHeading] = useState<
        string | undefined
    >(undefined)
    useEffect(() => {
        updateHeading({ customHeading: pkgNameForHeading })
    }, [pkgNameForHeading, updateHeading])

    const { loggedInUser } = useAuth()
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic of true

    const statePrograms = useStatePrograms()

    const { result: fetchResult } = useFetchHealthPlanPackageWrapper(id)

    const [updateFormData] = useUpdateHealthPlanFormDataMutation()

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
                console.info('Failed to update form data', updateResult)
                recordJSException(
                    `StateSubmissionForm: Apollo error reported. Error message: Failed to update form data ${updateResult}`
                )
                return new Error('Failed to update form data')
            }

            return updatedSubmission
        } catch (serverError) {
            setShowPageErrorMessage(true)
            recordJSException(
                `StateSubmissionForm: Apollo error reported. Error message: ${serverError.message}`
            )
            return new Error(serverError)
        }
    }

    if (fetchResult.status === 'LOADING') {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (fetchResult.status === 'ERROR') {
        const err = fetchResult.error
        console.error('Error from API fetch', fetchResult.error)
        if (err instanceof ApolloError) {
            handleApolloError(err, true)
        } else {
            recordJSException(err)
        }
        return <GenericErrorPage /> // api failure or protobuf decode failure
    }

    const { data, revisionsLookup } = fetchResult
    const pkg = data.fetchHealthPlanPackage.pkg

    // fetchHPP returns null if no package is found with the given ID
    if (!pkg) {
        return <Error404 />
    }

    // pull out the latest revision and document lookups
    const latestRevision = pkg.revisions[0].node
    const formDataFromLatestRevision =
        revisionsLookup[latestRevision.id].formData
    const documentDates = makeDocumentDateTable(revisionsLookup)
    const documentLists = makeDocumentS3KeyLookup(revisionsLookup)

    // if we've gotten back a submitted revision, it can't be edited
    if (formDataFromLatestRevision.status !== 'DRAFT') {
        return <ErrorInvalidSubmissionStatus />
    }

    const computedSubmissionName = packageName(
        formDataFromLatestRevision,
        statePrograms
    )
    if (pkgNameForHeading !== computedSubmissionName) {
        setPkgNameForHeading(computedSubmissionName)
    }

    // An unlocked revision is defined by having unlockInfo on it, pull it out here if it exists
    const unlockedInfo: UpdateInformation | undefined =
        latestRevision.unlockInfo || undefined

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
                                previousDocuments={
                                    documentLists.previousDocuments
                                }
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
                                previousDocuments={
                                    documentLists.previousDocuments
                                }
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
                                previousDocuments={
                                    documentLists.previousDocuments
                                }
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
                                documentDateLookupTable={documentDates}
                                unlocked={!!unlockedInfo}
                                submissionName={computedSubmissionName}
                            />
                        }
                    />
                    <Route path="*" element={<Error404 />} />
                </Routes>
            </StateSubmissionContainer>
        </>
    )
}

import React, { useState, useEffect } from 'react'

import { Alert, GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams, useLocation } from 'react-router-dom'

import { Error404 } from '../Errors/Error404'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatus'
import { GenericError } from '../Errors/GenericError'
import { Loading } from '../../components/Loading'
import { DynamicStepIndicator } from '../../components/DynamicStepIndicator'
import { usePage } from '../../contexts/PageContext'
import {
    RoutesRecord,
    getRouteName,
    STATE_SUBMISSION_FORM_ROUTES,
    RouteT,
} from '../../constants/routes'
import { StateSubmissionContainer } from './StateSubmissionContainer'
import { ContractDetails } from './ContractDetails/ContractDetails'
import { RateDetails } from './RateDetails/RateDetails'
import { Contacts } from './Contacts/Contacts'
import { Documents } from './Documents/Documents'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType/SubmissionType'

import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
    useUpdateDraftSubmissionMutation,
    useFetchDraftSubmissionQuery,
} from '../../gen/gqlClient'

const GenericFormAlert = () => <Alert type="error">Something went wrong</Alert>

const activeFormPages = (draft: DraftSubmission): RouteT[] => {
    // If submission type is contract only, rate details is left out of the step indicator
    return STATE_SUBMISSION_FORM_ROUTES.filter(
        (formPage) =>
            !(
                draft?.submissionType === 'CONTRACT_ONLY' &&
                formPage === 'SUBMISSIONS_RATE_DETAILS'
            )
    )
}

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const currentRoute = getRouteName(pathname)
    const { updateHeading } = usePage()
    const [showFormAlert, setShowFormAlert] = useState(false)

    // Set up graphql calls
    const {
        data: fetchData,
        loading,
        error: fetchError,
    } = useFetchDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const [updateDraftSubmission, { error: updateError }] =
        useUpdateDraftSubmissionMutation()

    const updateDraft = async (
        input: UpdateDraftSubmissionInput
    ): Promise<DraftSubmission | undefined> => {
        setShowFormAlert(false)
        try {
            const updateResult = await updateDraftSubmission({
                variables: {
                    input: input,
                },
            })
            const updatedSubmission: DraftSubmission | undefined =
                updateResult?.data?.updateDraftSubmission.draftSubmission

            if (!updatedSubmission) setShowFormAlert(true)

            return updatedSubmission
        } catch (serverError) {
            setShowFormAlert(true)
            return undefined
        }
    }

    const draft = fetchData?.fetchDraftSubmission?.draftSubmission

    // Set up side effects
    useEffect(() => {
        updateHeading(pathname, draft?.name)
    }, [updateHeading, pathname, draft?.name])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (updateError && !showFormAlert) {
        setShowFormAlert(true)
    }

    if (fetchError) {
        /*  On fetch draft error, check if submission is already submitted
            if so,  display summary page or already sent to CMS message depending on submissions/:id/route,
            if not, display generic eror
        */
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
        return specificContent ?? <GenericError />
    }

    if (draft === undefined || draft === null) {
        return <Error404 />
    }

    return (
        <>
            <DynamicStepIndicator
                formPages={activeFormPages(draft)}
                currentFormPage={currentRoute}
            />
            <StateSubmissionContainer>
                <Switch>
                    <Route path={RoutesRecord.SUBMISSIONS_TYPE}>
                        <SubmissionType
                            draftSubmission={draft}
                            updateDraft={updateDraft}
                            formAlert={
                                showFormAlert ? GenericFormAlert() : undefined
                            }
                        />
                    </Route>
                    <Route path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}>
                        <ContractDetails
                            draftSubmission={draft}
                            updateDraft={updateDraft}
                            formAlert={
                                showFormAlert ? GenericFormAlert() : undefined
                            }
                        />
                    </Route>
                    <Route path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}>
                        <RateDetails
                            draftSubmission={draft}
                            updateDraft={updateDraft}
                            formAlert={
                                showFormAlert ? GenericFormAlert() : undefined
                            }
                        />
                    </Route>
                    <Route path={RoutesRecord.SUBMISSIONS_CONTACTS}>
                        <Contacts
                            draftSubmission={draft}
                            updateDraft={updateDraft}
                            formAlert={
                                showFormAlert ? GenericFormAlert() : undefined
                            }
                        />
                    </Route>
                    <Route path={RoutesRecord.SUBMISSIONS_DOCUMENTS}>
                        <Documents
                            draftSubmission={draft}
                            updateDraft={updateDraft}
                            formAlert={
                                showFormAlert ? GenericFormAlert() : undefined
                            }
                        />
                    </Route>
                    <Route path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}>
                        <ReviewSubmit draftSubmission={draft} />
                    </Route>
                </Switch>
            </StateSubmissionContainer>
        </>
    )
}

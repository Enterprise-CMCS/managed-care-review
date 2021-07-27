import React, { useState, useEffect } from 'react'

import { Alert, GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams, useLocation } from 'react-router-dom'

import { Error404 } from '../Errors/Error404'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatus'
import { GenericError } from '../Errors/GenericError'
import { Loading } from '../../components/Loading/'
import { DynamicStepIndicator } from '../../components/DynamicStepIndicator/'
import { usePage } from '../../contexts/PageContext'
import {
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
    getRouteName,
    RouteT,
} from '../../constants/routes'
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

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const routeConstant = getRouteName(pathname)
    const { updateHeading } = usePage()
    const [showFormAlert, setShowFormAlert] = useState(false)
    const formPages = [
        'SUBMISSIONS_CONTRACT_DETAILS',
        'SUBMISSIONS_RATE_DETAILS',
        'SUBMISSIONS_CONTACTS',
        'SUBMISSIONS_DOCUMENTS',
        'SUBMISSIONS_REVIEW_SUBMIT',
    ] as RouteT[]

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
                if (STATE_SUBMISSION_FORM_ROUTES.includes(routeConstant)) {
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
                formPages={formPages}
                submissionType={draft.submissionType}
                pathname={pathname}
            />

            <GridContainer>
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
            </GridContainer>
        </>
    )
}

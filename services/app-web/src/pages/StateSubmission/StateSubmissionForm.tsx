import React, { useState, useEffect } from 'react'

import { Alert, GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams, useLocation } from 'react-router-dom'
import styles from './StateSubmissionForm.module.scss'

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
import {getCurrentRevisionFromSubmission2, convertDomainModelFormDataToGQLSubmission, isGQLDraftSubmission} from '../../gqlHelpers'
import { StateSubmissionContainer } from './StateSubmissionContainer'
import { ContractDetails } from './ContractDetails'
import { RateDetails } from './RateDetails'
import { Contacts } from './Contacts'
import { Documents } from './Documents'
import { ReviewSubmit } from './ReviewSubmit'
import { SubmissionType } from './SubmissionType'

import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
    useUpdateDraftSubmissionMutation,
    useFetchSubmission2Query
} from '../../gen/gqlClient'
import { GQLSubmissionUnionType } from '../../gqlHelpers/submissionWithRevisions'

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
type FormDataError = 'NOT_FOUND' | 'MALFORMATTED_DATA' | 'WRONG_SUBMISSION_STATUS'

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const currentRoute = getRouteName(pathname)
    const { updateHeading } = usePage()
    const [formDataFromLatestRevision, setFormDataFromLatestRevision] =
        useState<GQLSubmissionUnionType | null>(null)
    const [formDataError, setFormDataError] = useState<FormDataError | null>(
        null
    )
    const [showFormAlert, setShowFormAlert] = useState(false)

    // Set up graphql calls
    const {
        data: fetchData,
        loading,
        error: fetchError,
    } = useFetchSubmission2Query({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const submissionAndRevisions = fetchData?.fetchSubmission2?.submission
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

    // Set up side effects
    useEffect(() => {
        if (formDataFromLatestRevision) {
            const { name } = formDataFromLatestRevision
            updateHeading(pathname, name)
        }
    }, [updateHeading, pathname, formDataFromLatestRevision])

    useEffect(() => {
        if (submissionAndRevisions) {
            const currentRevisionPackageOrError =
                getCurrentRevisionFromSubmission2(submissionAndRevisions)

            if (currentRevisionPackageOrError instanceof Error) {
                setFormDataError('MALFORMATTED_DATA')
            } else {
                const formattedCurrentRevision = convertDomainModelFormDataToGQLSubmission(currentRevisionPackageOrError)
                if (
                    !formattedCurrentRevision
                ) {
                    setFormDataError('NOT_FOUND')
                } else if (
                    !isGQLDraftSubmission(formattedCurrentRevision)
                ) {
                    setFormDataError('WRONG_SUBMISSION_STATUS')
                } else {
                    // we think we have valid data
                    setFormDataFromLatestRevision(formattedCurrentRevision)
                }
            } 
        }
    }, [submissionAndRevisions])

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
        return specificContent ?? <GenericError />
    }

    if (formDataError === 'MALFORMATTED_DATA') {
        return <GenericError />
    }

    if (formDataError === 'NOT_FOUND' || (fetchData &&  !formDataFromLatestRevision)) {
        return <Error404 />
    }

    if (formDataError === 'WRONG_SUBMISSION_STATUS') {
        return <ErrorInvalidSubmissionStatus />
    }

    const draft = formDataFromLatestRevision as DraftSubmission

    return (
        <>
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={activeFormPages(draft)}
                    currentFormPage={currentRoute}
                />
            </div>
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

import React, { useEffect } from 'react'

import { Alert, GridContainer } from '@trussworks/react-uswds'
import { Switch, Route, useParams, useLocation } from 'react-router-dom'

import { Error404 } from '../Errors/Error404'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatus'
import { GenericError } from '../Errors/GenericError'
import { Loading } from '../../components/Loading/'
import { usePage } from '../../contexts/PageContext'
import { RoutesRecord } from '../../constants/routes'
import { ContractDetails } from './ContractDetails/ContractDetails'
import { RateDetails } from './RateDetails/RateDetails'
import { Documents } from './Documents/Documents'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType/SubmissionType'

import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
    useUpdateDraftSubmissionMutation,
    useFetchDraftSubmissionQuery,
} from '../../gen/gqlClient'

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { updateHeading } = usePage()
    const [showFormAlert, setShowFormAlert] = React.useState(false)

    const { data: fetchData, loading, error } = useFetchDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const [
        updateDraftSubmission,
        { error: updateError },
    ] = useUpdateDraftSubmissionMutation()

    if (updateError && !showFormAlert) {
        setShowFormAlert(true)
        console.log(
            'Log: updating submission failed with gql error',
            updateError
        )
    }

    const draft = fetchData?.fetchDraftSubmission?.draftSubmission

    useEffect(() => {
        updateHeading(pathname, draft?.name)
    }, [updateHeading, pathname, draft])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error) {
        console.log('error loading draft:', error)

        // check to see if we have a specific submission error
        let specificErr: React.ReactElement | undefined = undefined
        error.graphQLErrors.forEach((err) => {
            if (err?.extensions?.code === 'WRONG_STATUS') {
                specificErr = <ErrorInvalidSubmissionStatus />
            }
        })

        return specificErr ?? <GenericError />
    }

    if (draft === undefined || draft === null) {
        return <Error404 />
    }

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

    const GenericFormAlert = () => (
        <Alert type="error">Something went wrong</Alert>
    )
    return (
        <GridContainer>
            <Switch>
                <Route path={RoutesRecord.SUBMISSIONS_TYPE}>
                    <SubmissionType draftSubmission={draft} />
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
                <Route path={RoutesRecord.SUBMISSIONS_DOCUMENTS}>
                    <Documents draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}>
                    <ReviewSubmit draftSubmission={draft} />
                </Route>
            </Switch>
        </GridContainer>
    )
}

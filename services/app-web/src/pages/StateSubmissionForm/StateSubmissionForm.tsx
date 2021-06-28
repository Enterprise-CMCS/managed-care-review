import React, { useEffect } from 'react'

import {
    GridContainer,
    StepIndicator,
    StepIndicatorStep,
  } from '@trussworks/react-uswds'
import { Switch, Route, useParams, useLocation } from 'react-router-dom'

import { Error404 } from '../Errors/Error404'
import { ErrorInvalidSubmissionStatus } from '../Errors/ErrorInvalidSubmissionStatus'
import { GenericError } from '../Errors/GenericError'
import { Loading } from '../../components/Loading/'
import { usePage } from '../../contexts/PageContext'
import { RoutesRecord, getRouteName, PageTitlesRecord, RouteT } from '../../constants/routes'
import { ContractDetails } from './ContractDetails/ContractDetails'
import { RateDetails } from './RateDetails/RateDetails'
import { Documents } from './Documents/Documents'
import { ReviewSubmit } from './ReviewSubmit/ReviewSubmit'
import { SubmissionType } from './SubmissionType/SubmissionType'

import { useFetchDraftSubmissionQuery } from '../../gen/gqlClient'

export const StateSubmissionForm = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { updateHeading } = usePage()

    const { data, loading, error } = useFetchDraftSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })
    const draft = data?.fetchDraftSubmission?.draftSubmission

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

    const FormPages = [
        'SUBMISSIONS_CONTRACT_DETAILS',
        'SUBMISSIONS_RATE_DETAILS',
        'SUBMISSIONS_DOCUMENTS',
        'SUBMISSIONS_REVIEW_SUBMIT',
    ] as RouteT[]

    const DynamicStepIndicator = () => {

        const currentFormPage = getRouteName(pathname)

        let formStepCompleted = true;
        let formStepStatus: 'current' | 'complete' | undefined

        return(
          <>
            <StepIndicator>
                {FormPages.map((formPageName) => {
                  if (formPageName === currentFormPage) {
                    formStepCompleted = false;
                    formStepStatus = 'current';
                  }
                  else if (formStepCompleted) {
                    formStepStatus = 'complete'
                  }
                  else {
                    formStepStatus = undefined;
                  }

                  return (
                      <StepIndicatorStep
                          label={PageTitlesRecord[formPageName]}
                          status={formStepStatus}
                          key={PageTitlesRecord[formPageName]}
                      />
                  )
                })}
            </StepIndicator>
          </>
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

    return (
      <>
        <DynamicStepIndicator />

        <GridContainer>
            <Switch>
                <Route path={RoutesRecord.SUBMISSIONS_TYPE}>
                    <SubmissionType draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}>
                    <ContractDetails draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}>
                    <RateDetails draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_DOCUMENTS}>
                    <Documents draftSubmission={draft} />
                </Route>
                <Route path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}>
                    <ReviewSubmit draftSubmission={draft} />
                </Route>
            </Switch>
        </GridContainer>
      </>
    )
}

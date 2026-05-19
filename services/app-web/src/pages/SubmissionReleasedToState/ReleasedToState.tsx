import React, { useEffect, useLayoutEffect } from 'react'
import styles from './ReleasedToState.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    ErrorSummary,
    FieldTextarea,
    GenericApiErrorBanner,
    PoliteErrorMessage,
    PageActionsContainer,
    SectionHeader,
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { useErrorSummary } from '../../hooks/useErrorSummary'
import {
    ContractSubmissionTypeRecord,
    RoutesRecord,
} from '@mc-review/constants'
import { useNavigate } from 'react-router-dom'
import {
    ApproveContractDocument,
    FetchContractDocument,
} from '../../gen/gqlClient'
import { useMutation, useQuery } from '@apollo/client/react'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/SharedSubmissionComponents'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import {
    ButtonGroup,
    DatePicker,
    Form,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { usePage } from '../../contexts/PageContext'
import { recordJSException } from '@mc-review/otel'
import { useMemoizedStateHeader, useRouteParams, useTealium } from '../../hooks'
import * as Yup from 'yup'
import { formatUserInputDate } from '@mc-review/dates'
import { validateDateFormat } from '../../formHelpers'
import { Error404 } from '../Errors/Error404Page'

type ReleasedToStateValues = {
    dateApprovalReleasedToState: string
    releasedToStateReason: string
}

const today = new Date()
Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

const buildReleaseToStateSchema = (isAdminUser: boolean) =>
    Yup.object().shape({
        dateApprovalReleasedToState: Yup.date()
            .required('You must select a date')
            .max(today.toString(), 'You must enter a valid date')

            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .typeError('Date must be in MM/DD/YYYY format'),
        releasedToStateReason: isAdminUser
            ? Yup.string().required(
                  'Admin users must provide a reason for releasing to state.'
              )
            : Yup.string(),
    })

type FormError =
    FormikErrors<ReleasedToStateValues>[keyof FormikErrors<ReleasedToStateValues>]

const ReleasedToState = () => {
    const { id, contractSubmissionType } = useRouteParams()
    const { updateHeading, updateActiveMainContent } = usePage()
    const { logFormSubmitEvent } = useTealium()
    const { loggedInUser } = useAuth()
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()

    const showFieldErrors = (error?: FormError): boolean =>
        shouldValidate && Boolean(error)

    const [approveContract, { error: approveError, loading: approveLoading }] =
        useMutation(ApproveContractDocument)
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useQuery(FetchContractDocument, {
        variables: {
            input: {
                contractID: id || 'not-found',
            },
        },
    })

    const formInitialValues: ReleasedToStateValues = {
        dateApprovalReleasedToState: '',
        releasedToStateReason: '',
    }

    const contract = fetchContractData?.fetchContract.contract
    const contractName =
        (contract?.packageSubmissions &&
            contract?.packageSubmissions[0].contractRevision.contractName) ||
        ''
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: contractName,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    // update heading
    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('ReleasedToStateForm')
    }, [updateActiveMainContent])

    if (fetchContractLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (fetchContractError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(fetchContractError)}
            />
        )
    }

    if (!contract || contract.status === 'DRAFT') {
        return <GenericErrorPage />
    }

    if (
        ContractSubmissionTypeRecord[contract.contractSubmissionType] !==
        contractSubmissionType
    ) {
        return <Error404 />
    }

    const approveContractAction = async (values: ReleasedToStateValues) => {
        logFormSubmitEvent({
            heading: 'Approve submission',
            form_name: 'Approve submission',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await approveContract({
                variables: {
                    input: {
                        contractID: contract.id,
                        dateApprovalReleasedToState:
                            values.dateApprovalReleasedToState,
                        updatedReason: values.releasedToStateReason,
                    },
                },
            })
            navigate(`/submissions/${contractSubmissionType}/${id}`)
        } catch (err) {
            recordJSException(
                `ReleasedToState: GraphQL error reported. Error message: Failed to create form data ${err}`
            )
        }
    }

    return (
        <div className={styles.uploadFormContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: `/submissions/${contractSubmissionType}/${id}`,
                        text: contractName,
                    },
                    {
                        text: 'Released to state',
                        link: RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE,
                    },
                ]}
            />
            <h1>Released to state</h1>
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => approveContractAction(values)}
                validationSchema={buildReleaseToStateSchema(isAdminUser)}
            >
                {({ handleSubmit, handleChange, errors, setFieldValue }) => (
                    <Form
                        id="ReleasedToStateForm"
                        className={styles.formContainer}
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                            setShouldValidate(true)
                            setFocusErrorSummaryHeading(true)
                            return handleSubmit(e)
                        }}
                    >
                        {approveError && <GenericApiErrorBanner />}
                        {shouldValidate && (
                            <ErrorSummary
                                errors={errors as { [field: string]: string }}
                                headingRef={errorSummaryHeadingRef}
                            />
                        )}
                        <fieldset className="usa-fieldset">
                            <SectionHeader
                                headerId={'releaseToStateHeader'}
                                headingLevel="h3"
                                header={
                                    'Are you sure you want to mark this submission as Released to the state?'
                                }
                                hideBorderTop
                            />
                            <p>
                                Once you select Released to state, the status
                                will change from Submitted to Approved on the
                                dashboard. This submission should only be marked
                                as released after the approval letter has been
                                released to the state.
                            </p>
                            <FormGroup
                                error={showFieldErrors(
                                    errors.dateApprovalReleasedToState
                                )}
                            >
                                <Label
                                    htmlFor="dateApprovalReleasedToState"
                                    id="dateApprovalReleasedToState-label"
                                    tabIndex={-1}
                                    className="margin-bottom-0 text-bold"
                                >
                                    Date released to state
                                </Label>
                                <p
                                    id="dateApprovalReleasedToState-required"
                                    className="margin-bottom-0 margin-top-05 usa-hint"
                                >
                                    Required
                                </p>
                                <p
                                    id="dateApprovalReleasedToState-hint"
                                    className="margin-bottom-0 margin-top-05 usa-hint"
                                >
                                    mm/dd/yyyy
                                </p>
                                {showFieldErrors(
                                    errors.dateApprovalReleasedToState
                                ) && (
                                    <PoliteErrorMessage formFieldLabel="Date released to state">
                                        {errors.dateApprovalReleasedToState}
                                    </PoliteErrorMessage>
                                )}
                                <DatePicker
                                    validationStatus={
                                        showFieldErrors(
                                            errors.dateApprovalReleasedToState
                                        )
                                            ? 'error'
                                            : undefined
                                    }
                                    aria-required
                                    aria-labelledby="dateApprovalReleasedToState-label"
                                    aria-describedby="dateApprovalReleasedToState-required dateApprovalReleasedToState-hint"
                                    id="dateApprovalReleasedToState"
                                    name="dateApprovalReleasedToState"
                                    onChange={(val) =>
                                        setFieldValue(
                                            'dateApprovalReleasedToState',
                                            formatUserInputDate(val)
                                        )
                                    }
                                />
                            </FormGroup>
                            {isAdminUser && (
                                <FieldTextarea
                                    label="Reason for releasing this submission to the state."
                                    id="releasedToStateReason"
                                    data-testid="releasedToStateReason"
                                    name="releasedToStateReason"
                                    aria-required
                                    hint="Admin users are required to input a reason for releasing to the state."
                                    showError={showFieldErrors(
                                        errors.releasedToStateReason
                                    )}
                                    onChange={handleChange}
                                />
                            )}
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page body"
                                    link_url={`/submissions/${contractSubmissionType}/${id}`}
                                    onClick={() =>
                                        navigate(
                                            `/submissions/${contractSubmissionType}/${id}`
                                        )
                                    }
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    disabled={
                                        shouldValidate &&
                                        !!Object.keys(errors).length
                                    }
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/submissions/${contractSubmissionType}/${id}`}
                                    animationTimeout={1000}
                                    loading={approveLoading}
                                >
                                    Released to state
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export { ReleasedToState }

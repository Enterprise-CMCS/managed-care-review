import React, { useEffect } from 'react'
import styles from './ReleasedToState.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    GenericApiErrorBanner,
    PoliteErrorMessage,
} from '../../components'
import { RoutesRecord } from '@mc-review/constants'
import { useNavigate, useParams } from 'react-router-dom'
import {
    useApproveContractMutation,
    useFetchContractQuery,
} from '../../gen/gqlClient'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/ErrorOrLoadingPage'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import {
    ButtonGroup,
    DatePicker,
    Form,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import { PageActionsContainer } from '../StateSubmission/HealthPlanSubmission/PageActions'
import { Formik, FormikErrors } from 'formik'
import { usePage } from '../../contexts/PageContext'
import { recordJSException } from '@mc-review/otel'
import { useTealium } from '../../hooks'
import * as Yup from 'yup'
import { formatUserInputDate } from '@mc-review/dates'
import { validateDateFormat } from '../../formHelpers'

type ReleasedToStateValues = {
    dateApprovalReleasedToState: string
}

const today = new Date()
Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

const ReleaseToStateSchema = Yup.object().shape({
    dateApprovalReleasedToState: Yup.date()
        .required('You must select a date')
        .max(today.toString(), 'You must enter a valid date')

        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .typeError('Date must be in MM/DD/YYYY format'),
})

type FormError =
    FormikErrors<ReleasedToStateValues>[keyof FormikErrors<ReleasedToStateValues>]

const ReleasedToState = () => {
    const { id, contractSubmissionType } = useParams<{
        id: string
        contractSubmissionType: string
    }>()
    const { updateHeading } = usePage()
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)

    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)

    const [approveContract, { error: approveError, loading: approveLoading }] =
        useApproveContractMutation()
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id || 'not-found',
            },
        },
    })

    const formInitialValues: ReleasedToStateValues = {
        dateApprovalReleasedToState: '',
    }

    const contract = fetchContractData?.fetchContract.contract
    const contractName =
        (contract?.packageSubmissions &&
            contract?.packageSubmissions[0].contractRevision.contractName) ||
        ''

    // update heading
    useEffect(() => {
        updateHeading({ customHeading: `${contractName} Released to state` })
    }, [contractName, updateHeading])

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
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => approveContractAction(values)}
                validationSchema={ReleaseToStateSchema}
            >
                {({ handleSubmit, errors, setFieldValue }) => (
                    <Form
                        id="ReleasedToStateForm"
                        className={styles.formContainer}
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {approveError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <h2>
                                Are you sure you want to mark this submission as
                                Released to the state?
                            </h2>
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
                                className="margin-top-0"
                            >
                                <Label
                                    htmlFor="dateApprovalReleasedToState"
                                    className="margin-bottom-0 text-bold"
                                >
                                    Date released to state
                                </Label>
                                <p className="margin-bottom-0 margin-top-05 usa-hint">
                                    Required
                                </p>
                                <p className="margin-bottom-0 margin-top-05 usa-hint">
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
                                    aria-required
                                    aria-describedby="dateApprovalReleasedToState"
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
                                    disabled={showFieldErrors(
                                        errors.dateApprovalReleasedToState
                                    )}
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

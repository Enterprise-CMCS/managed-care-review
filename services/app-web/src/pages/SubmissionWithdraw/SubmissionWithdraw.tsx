import React from 'react'
import styles from './SubmissionWithdraw.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    GenericApiErrorBanner,
    PoliteErrorMessage,
} from '../../components'
import { RoutesRecord } from '@mc-review/constants'
import { useNavigate, useParams } from 'react-router-dom'
import {
    useFetchContractQuery,
    useWithdrawContractMutation,
} from '../../gen/gqlClient'
import { Formik, FormikErrors } from 'formik'
import {
    ButtonGroup,
    Form,
    FormGroup,
    Label,
    Textarea,
} from '@trussworks/react-uswds'
import { PageActionsContainer } from '../StateSubmission/PageActions'
import * as Yup from 'yup'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/ErrorOrLoadingPage'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { useTealium } from '../../hooks'
import { recordJSException } from '@mc-review/otel'

type SubmissionWithdrawValues = {
    submissionWithdrawReason: string
}

type FormError =
    FormikErrors<SubmissionWithdrawValues>[keyof FormikErrors<SubmissionWithdrawValues>]

const submissionWithdrawSchema = Yup.object().shape({
    submissionWithdrawReason: Yup.string().required(
        'You must provide a reason for withdrawing this submission.'
    ),
})

export const SubmissionWithdraw = (): React.ReactElement => {
    const { id } = useParams() as { id: string }
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [
        withdrawContract,
        { error: withdrawError, loading: withdrawLoading },
    ] = useWithdrawContractMutation()
    const showFieldErrors = (error?: FormError): boolean | undefined =>
        shouldValidate && Boolean(error)
    const formInitialValues: SubmissionWithdrawValues = {
        submissionWithdrawReason: '',
    }

    const { data, loading, error } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
    })
    const contract = data?.fetchContract.contract

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    } else if (!contract || !contract.packageSubmissions) {
        return <GenericErrorPage />
    }

    const contractName =
        contract?.packageSubmissions[0].contractRevision.contractName

    const withdrawSubmissionPackage = async (
        values: SubmissionWithdrawValues
    ) => {
        logFormSubmitEvent({
            heading: 'Withdraw submission',
            form_name: 'Withdraw submission',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await withdrawContract({
                variables: {
                    input: {
                        contractID: id,
                        updatedReason: values.submissionWithdrawReason,
                    },
                },
            })
            navigate(`/submissions/${id}`)
        } catch (err) {
            recordJSException(
                `WithdrawContract: Apollo error reported. Error message: Failed to create form data ${err}`
            )
        }
    }

    return (
        <div className={styles.submissionWithdrawContainer}>
            <Breadcrumbs
                className="use-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: `/submissions/${id}`,
                        text: contractName || '',
                    },
                    {
                        text: 'Withdraw submission',
                        link: RoutesRecord.SUBMISSION_WITHDRAW,
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => withdrawSubmissionPackage(values)}
                validationSchema={submissionWithdrawSchema}
            >
                {({ handleSubmit, handleChange, errors, values }) => (
                    <Form
                        id="SubmissionWithdrawForm"
                        className={styles.formContainer}
                        aria-label="Withdraw submission"
                        aria-describedby="form-guidance"
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {withdrawError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <h2>Withdraw submission</h2>
                            <FormGroup
                                error={showFieldErrors(
                                    errors.submissionWithdrawReason
                                )}
                                className="margin-top-0"
                            >
                                <Label
                                    htmlFor="submissionWithdrawReason"
                                    className="margin-bottom-0 text-bold"
                                >
                                    Reason for withdrawing the submission.
                                </Label>
                                <p className="margin-bottom-0 margin-top-05 usa-hint">
                                    Required
                                </p>
                                {showFieldErrors(
                                    errors.submissionWithdrawReason
                                ) && (
                                    <PoliteErrorMessage formFieldLabel="">
                                        {errors.submissionWithdrawReason}
                                    </PoliteErrorMessage>
                                )}
                                <Textarea
                                    name="submissionWithdrawReason"
                                    id="submissionWithdrawReason"
                                    data-testid="submissionWithdrawReason"
                                    aria-labelledby="submissionWithdrawReason"
                                    aria-required
                                    defaultValue={
                                        values.submissionWithdrawReason
                                    }
                                    onChange={handleChange}
                                    error={showFieldErrors(
                                        errors.submissionWithdrawReason
                                    )}
                                />
                            </FormGroup>
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page-body"
                                    link_url={`/submissions/${id}`}
                                    onClick={() =>
                                        navigate(`/submissions/${id}`)
                                    }
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/submissions/${id}`}
                                    animationTimeout={1000}
                                    disabled={showFieldErrors(
                                        errors.submissionWithdrawReason
                                    )}
                                    loading={withdrawLoading}
                                >
                                    Withdraw submission
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

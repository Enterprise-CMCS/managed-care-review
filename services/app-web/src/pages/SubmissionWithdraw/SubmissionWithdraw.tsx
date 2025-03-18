import React from 'react'
import styles from './SubmissionWithdraw.module.scss'
import { ActionButton, Breadcrumbs } from '../../components'
import { RoutesRecord } from '@mc-review/constants'
import { useNavigate, useParams } from 'react-router-dom'
import { useFetchContractQuery } from '../../gen/gqlClient'
import { Formik } from 'formik'
import {
    ButtonGroup,
    Form,
    FormGroup,
    Label,
    Textarea,
} from '@trussworks/react-uswds'
import { PageActionsContainer } from '../StateSubmission/PageActions'

type SubmissionWithdrawValues = {
    submissionWithdrawReason: string
}

export const SubmissionWithdraw = (): React.ReactElement => {
    const { id } = useParams() as { id: string }
    const navigate = useNavigate()
    const formInitialValues: SubmissionWithdrawValues = {
        submissionWithdrawReason: '',
    }

    const { data } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
    })
    const contract = data?.fetchContract.contract
    const contractName =
        contract?.packageSubmissions[0].contractRevision.contractName

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
                onSubmit={() => window.alert('Not implemented')}
                validationSchema={() => window.alert('Not implemented')}
            >
                <Form
                    id="SubmissionWithdrawForm"
                    className={styles.formContainer}
                    aria-label="Withdraw submission"
                    aria-describedby="form-guidance"
                    onSubmit={() => window.alert('Not implemented')}
                >
                    <fieldset className="usa-fieldset">
                        <h2>Withdraw submission</h2>
                        <FormGroup className="margin-top-0">
                            <Label
                                htmlFor="submissionWithdrawReason"
                                className="margin-bottom-0 text-bold"
                            >
                                Reason for withdrawing
                            </Label>
                            <p className="margin-bottom-0 margin-top-05 usa-hint">
                                Required
                            </p>
                            <p className="margin-bottom-0 margin-top-05 usa-hint">
                                Provide a reason for withdrawing the submission.
                            </p>
                            <Textarea
                                name="submissionWithdrawReason"
                                id="submissionWithdrawReason"
                                data-testid="submissionWithdrawReason"
                                aria-labelledby="submissionWithdrawReason"
                                aria-required
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
                                onClick={() => navigate(`/submissions/${id}`)}
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
                            >
                                Withdraw submission
                            </ActionButton>
                        </ButtonGroup>
                    </PageActionsContainer>
                </Form>
            </Formik>
        </div>
    )
}

import React, { useEffect } from 'react'
import styles from './ReleasedToState.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
} from '../../components'
import { RoutesRecord } from '../../constants'
import { useNavigate, useParams } from 'react-router-dom'
import {
    useApproveContractMutation,
    useFetchContractQuery,
} from '../../gen/gqlClient'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/ErrorOrLoadingPage'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { ButtonGroup, Form } from '@trussworks/react-uswds'
import { PageActionsContainer } from '../StateSubmission/PageActions'
import { Formik } from 'formik'
import { usePage } from '../../contexts/PageContext'
import { recordJSException } from '../../otelHelpers'
import { useTealium } from '../../hooks'
import * as Yup from 'yup'

type ReleasedToStateValues = {
    optionalNote?: string
}

const ReleaseToStateSchema = Yup.object().shape({
    optionalNote: Yup.string().optional(),
})

const ReleasedToState = () => {
    const { id } = useParams<{ id: string }>()
    const { updateHeading } = usePage()
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()

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
        optionalNote: '',
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
                        updatedReason: values.optionalNote,
                    },
                },
            })
            navigate(`/submissions/${id}`)
        } catch (err) {
            recordJSException(
                `ReleasedToState: Apollo error reported. Error message: Failed to create form data ${err}`
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
                    { link: `/submissions/${id}`, text: contractName },
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
                {({ handleSubmit }) => (
                    <Form
                        id="ReleasedToStateForm"
                        className={styles.formContainer}
                        aria-label="Mark this submission as Released to the state?"
                        aria-describedby="form-guidance"
                        onSubmit={(e) => {
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
                            <FieldTextarea
                                label="Provide an optional note"
                                id="optionalNote"
                                name="optionalNote"
                                data-testid="optionalNote"
                                aria-describedby="optionalNoteHelp"
                                showError={false}
                            />
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page body"
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

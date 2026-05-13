import React, { useEffect, useLayoutEffect, useState } from 'react'
import styles from './UndoSubmissionUnlock.module.scss'
import * as Yup from 'yup'
import { Formik, FormikErrors } from 'formik'
import { usePage } from '../../contexts/PageContext'
import { useMemoizedStateHeader, useRouteParams, useTealium } from '../../hooks'
import {
    FetchContractDocument,
    ReverseUnlockContractDocument,
} from '../../gen/gqlClient'
import { useMutation, useQuery } from '@apollo/client/react'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
    PageActionsContainer,
} from '../../components'
import {
    ContractSubmissionTypeRecord,
    RoutesRecord,
} from '@mc-review/constants'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/SharedSubmissionComponents'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { ButtonGroup, Form } from '@trussworks/react-uswds'
import { recordJSException } from '@mc-review/otel'
import { generatePath, useNavigate } from 'react-router-dom'
import { Error404 } from '../Errors/Error404Page'

type UndoSubmissionUnlockValues = {
    undoSubmissionUnlockReason: string
}

type FormError =
    FormikErrors<UndoSubmissionUnlockValues>[keyof FormikErrors<UndoSubmissionUnlockValues>]

const UndoSubmissionUnlockSchema = Yup.object().shape({
    undoSubmissionUnlockReason: Yup.string().required(
        'You must provide a reason for this change.'
    ),
})

export const UndoSubmissionUnlock = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in undo submission unlock form.'
        )
    }
    const { updateHeading, updateActiveMainContent } = usePage()
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = useState(false)
    const showFieldErrors = (error?: FormError): boolean =>
        shouldValidate && Boolean(error)
    const [
        undoUnlockSubmission,
        { error: undoUnlockError, loading: undoUnlockLoading },
    ] = useMutation(ReverseUnlockContractDocument)

    const formInitialValues: UndoSubmissionUnlockValues = {
        undoSubmissionUnlockReason: '',
    }

    const { data, loading, error } = useQuery(FetchContractDocument, {
        variables: {
            input: {
                contractID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const contract = data?.fetchContract.contract
    const contractName =
        contract?.packageSubmissions[0].contractRevision.contractName
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: contractName,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    useEffect(() => {
        updateActiveMainContent('UndoSubmissionUnlockForm')
    }, [updateActiveMainContent])

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    } else if (!contract) {
        return <GenericErrorPage />
    }

    if (
        ContractSubmissionTypeRecord[contract.contractSubmissionType] !==
        contractSubmissionType
    ) {
        return <Error404 />
    }

    const undoUnlockSubmissionAction = async (
        values: UndoSubmissionUnlockValues
    ) => {
        logFormSubmitEvent({
            heading: 'Undo submission unlock',
            form_name: 'Undo submission unlock',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await undoUnlockSubmission({
                variables: {
                    input: {
                        contractID: id,
                        updatedReason: values.undoSubmissionUnlockReason,
                    },
                },
            })
            navigate(`/submissions/${contractSubmissionType}/${id}`)
        } catch (err) {
            recordJSException(
                `UndoSubmissionUnlock: GraphQL error reported. Error message: ${err}`
            )
        }
    }

    return (
        <div className={styles.undoSubmissionUnlockContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: `/submissions/${contractSubmissionType}/${id}`,
                        text: contractName || '',
                    },
                    {
                        link: generatePath(
                            RoutesRecord.UNDO_SUBMISSION_UNLOCK,
                            {
                                id,
                                contractSubmissionType,
                            }
                        ),
                        text: 'Undo submission unlock',
                    },
                ]}
            />
            <h1>Undo submission unlock</h1>
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => undoUnlockSubmissionAction(values)}
                validationSchema={UndoSubmissionUnlockSchema}
            >
                {({ handleSubmit, handleChange, errors }) => (
                    <Form
                        id="UndoSubmissionUnlockForm"
                        className={styles.formContainer}
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {undoUnlockError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <FieldTextarea
                                label="Reason for undoing the submission unlock."
                                id="undoSubmissionUnlockReason"
                                data-testid="undoSubmissionUnlockReason"
                                name="undoSubmissionUnlockReason"
                                aria-required
                                hint="This will discard the unlocked draft and move the submission back to its previously submitted status."
                                showError={showFieldErrors(
                                    errors.undoSubmissionUnlockReason
                                )}
                                onChange={handleChange}
                            />
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page-body"
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
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/submissions/${contractSubmissionType}/${id}`}
                                    animationTimeout={1000}
                                    disabled={showFieldErrors(
                                        errors.undoSubmissionUnlockReason
                                    )}
                                    loading={undoUnlockLoading}
                                >
                                    Undo submission unlock
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

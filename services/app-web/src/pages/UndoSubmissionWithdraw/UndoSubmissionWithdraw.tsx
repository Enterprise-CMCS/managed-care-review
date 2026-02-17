import React, { useEffect, useLayoutEffect, useState } from 'react'
import styles from './UndoSubmissionWithdraw.module.scss'
import * as Yup from 'yup'
import { Formik, FormikErrors } from 'formik'
import { usePage } from '../../contexts/PageContext'
import { useMemoizedStateHeader, useRouteParams, useTealium } from '../../hooks'
import {
    useFetchContractQuery,
    useUndoWithdrawContractMutation,
} from '../../gen/gqlClient'
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

type UndoSubmissionWithdrawValues = {
    undoSubmissionWithdrawReason: string
}

type FormError =
    FormikErrors<UndoSubmissionWithdrawValues>[keyof FormikErrors<UndoSubmissionWithdrawValues>]

const UndoSubmissionWithdrawSchema = Yup.object().shape({
    undoSubmissionWithdrawReason: Yup.string().required(
        'You must provide a reason for this change.'
    ),
})

export const UndoSubmissionWithdraw = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in submission withdraw form.'
        )
    }
    const { updateHeading, updateActiveMainContent } = usePage()    
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = useState(false)
    const showFieldErrors = (error?: FormError): boolean =>
        shouldValidate && Boolean(error)
    const [
        undoWithdrawSubmission,
        { error: undoWithdrawError, loading: undoWithdrawLoading },
    ] = useUndoWithdrawContractMutation()

    const formInitialValues: UndoSubmissionWithdrawValues = {
        undoSubmissionWithdrawReason: '',
    }

    const { data, loading, error } = useFetchContractQuery({
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

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])    

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error!)} />
    } else if (!contract) {
        return <GenericErrorPage />
    }

    if (
        ContractSubmissionTypeRecord[contract.contractSubmissionType] !==
        contractSubmissionType
    ) {
        return <Error404 />
    }

    const undoWithdrawSubmissionAction = async (
        values: UndoSubmissionWithdrawValues
    ) => {
        logFormSubmitEvent({
            heading: 'Undo withdraw',
            form_name: 'Undo Withdraw',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await undoWithdrawSubmission({
                variables: {
                    input: {
                        contractID: id,
                        updatedReason: values.undoSubmissionWithdrawReason,
                    },
                },
            })
            navigate(
                `/submissions/${contractSubmissionType}/${id}?showTempUndoWithdrawBanner=true`
            )
        } catch (err) {
            recordJSException(
                `undoWithdrawSubmission: GraphQL error reported. Error message: ${err}`
            )
        }
    }

    return (
        <div
            id={activeMainContentId}
            className={styles.undoSubmissionWithdrawContainer}
        >
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
                            RoutesRecord.UNDO_SUBMISSION_WITHDRAW,
                            { id, contractSubmissionType }
                        ),
                        text: 'Undo submission withdraw',
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => undoWithdrawSubmissionAction(values)}
                validationSchema={UndoSubmissionWithdrawSchema}
            >
                {({ handleSubmit, handleChange, errors, values }) => (
                    <Form
                        id="undoSubmissionWithdrawForm"
                        className={styles.formContainer}
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {undoWithdrawError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <h2>Undo submission withdraw</h2>
                            <FieldTextarea
                                label="Reason for undoing the submission withdraw."
                                id="undoSubmissionWithdrawReason"
                                data-testid="undoSubmissionWithdrawReason"
                                name="undoSubmissionWithdrawReason"
                                aria-required
                                hint="This will move the submission back to the submitted status."
                                showError={showFieldErrors(
                                    errors.undoSubmissionWithdrawReason
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
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/submissions/${contractSubmissionType}/${id}`}
                                    animationTimeout={1000}
                                    disabled={showFieldErrors(
                                        errors.undoSubmissionWithdrawReason
                                    )}
                                    loading={undoWithdrawLoading}
                                >
                                    Undo withdraw
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

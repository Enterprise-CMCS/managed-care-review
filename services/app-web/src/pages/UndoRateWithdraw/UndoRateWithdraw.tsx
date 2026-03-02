import React, { useEffect, useLayoutEffect } from 'react'
import styles from './UndoRateWithdraw.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
    PageActionsContainer,
} from '../../components'
import {
    useFetchRateQuery,
    useUndoWithdrawnRateMutation,
} from '../../gen/gqlClient'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/SharedSubmissionComponents'
import { RoutesRecord } from '@mc-review/constants'
import { generatePath, useNavigate, useParams } from 'react-router-dom'
import { ButtonGroup, Form } from '@trussworks/react-uswds'
import { usePage } from '../../contexts/PageContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import { useMemoizedStateHeader, useTealium } from '../../hooks'
import { recordJSException } from '@mc-review/otel'

type UndoRateWithdrawValues = {
    undoWithdrawReason: string
}

const UndoRateWithdrawSchema = Yup.object().shape({
    undoWithdrawReason: Yup.string().required(
        'You must provide a reason for this change.'
    ),
})

type FormError =
    FormikErrors<UndoRateWithdrawValues>[keyof FormikErrors<UndoRateWithdrawValues>]

export const UndoRateWithdraw = () => {
    const { id } = useParams() as { id: string }
    const { updateHeading, updateActiveMainContent } = usePage()
    const { logFormSubmitEvent } = useTealium()
    const navigate = useNavigate()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const showFieldErrors = (error?: FormError): boolean =>
        shouldValidate && Boolean(error)
    const [
        undoWithdrawRate,
        { error: undoWithdrawError, loading: undoWithdrawLoading },
    ] = useUndoWithdrawnRateMutation()

    const formInitialValues: UndoRateWithdrawValues = {
        undoWithdrawReason: '',
    }

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
    })

    const rate = data?.fetchRate.rate
    const rateCertificationName =
        rate?.packageSubmissions?.[0]?.rateRevision?.formData
            .rateCertificationName ?? undefined
    const stateHeader = useMemoizedStateHeader({
        subHeaderText:
            rate?.revisions[0].formData.rateCertificationName ?? undefined,
        stateCode: rate?.state.code,
        stateName: rate?.state.name,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

     // Set the active main content to focus when click the Skip to main content button.
     useEffect(() => {
         updateActiveMainContent('UndoRateWithdrawForm')
     }, [updateActiveMainContent])   

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    } else if (!rate || !rate.packageSubmissions) {
        return <GenericErrorPage />
    }

    const undoWithdrawRateAction = async (values: UndoRateWithdrawValues) => {
        logFormSubmitEvent({
            heading: 'Undo withdraw',
            form_name: 'Undo withdraw',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await undoWithdrawRate({
                variables: {
                    input: {
                        rateID: rate.id,
                        updatedReason: values.undoWithdrawReason,
                    },
                },
            })
            navigate(`/rates/${id}?showUndoWithdrawBanner=true`)
        } catch (err) {
            recordJSException(
                `UndoWithdrawRate: GraphQL error reported. Error message: ${err}`
            )
        }
    }

    return (
        <div className={styles.undoRateWithdrawContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_RATES,
                        text: 'Dashboard',
                    },
                    { link: `/rates/${id}`, text: rateCertificationName || '' },
                    {
                        text: 'Undo withdraw',
                        link: generatePath(RoutesRecord.UNDO_RATE_WITHDRAW, {
                            id,
                        }),
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => undoWithdrawRateAction(values)}
                validationSchema={UndoRateWithdrawSchema}
            >
                {({ handleSubmit, handleChange, errors, values }) => (
                    <Form
                        id="UndoRateWithdrawForm"
                        className={styles.formContainer}
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {undoWithdrawError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <h2>Undo withdraw</h2>
                            <FieldTextarea
                                label="Reason for change"
                                id="undoWithdrawReason"
                                data-testid="undoWithdrawReason"
                                name="undoWithdrawReason"
                                onChange={handleChange}
                                aria-required
                                hint="Provide a reason for this change. Clicking 'Undo withdraw' will move the rate back to he status of Submitted."
                                showError={showFieldErrors(
                                    errors.undoWithdrawReason
                                )}
                            />
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
                                    parent_component_type="page body"
                                    link_url={`/rates/${id}`}
                                    onClick={() => navigate(`/rates/${id}`)}
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    disabled={showFieldErrors(
                                        errors.undoWithdrawReason
                                    )}
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/rates/${id}`}
                                    animationTimeout={1000}
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

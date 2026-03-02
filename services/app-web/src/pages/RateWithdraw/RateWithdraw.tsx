import React, { useEffect, useLayoutEffect } from 'react'
import styles from './RateWithdraw.module.scss'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
    PageActionsContainer,
} from '../../components'
import { RoutesRecord } from '@mc-review/constants'
import { generatePath, useNavigate, useParams } from 'react-router-dom'
import { useFetchRateQuery, useWithdrawRateMutation } from '../../gen/gqlClient'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/SharedSubmissionComponents'
import { ButtonGroup, Form } from '@trussworks/react-uswds'
import * as Yup from 'yup'
import { Formik, FormikErrors } from 'formik'
import { usePage } from '../../contexts/PageContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { useMemoizedStateHeader, useTealium } from '../../hooks'
import { recordJSException } from '@mc-review/otel'

type RateWithdrawValues = {
    rateWithdrawReason: string
}

const RateWithdrawSchema = Yup.object().shape({
    rateWithdrawReason: Yup.string().required(
        'You must provide a reason for withdrawing this rate.'
    ),
})

type FormError =
    FormikErrors<RateWithdrawValues>[keyof FormikErrors<RateWithdrawValues>]

export const RateWithdraw = () => {
    const { id } = useParams() as { id: string }
    const { updateHeading, updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const { logFormSubmitEvent } = useTealium()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [withdrawRate, { error: withdrawError, loading: withdrawLoading }] =
        useWithdrawRateMutation()
    const showFieldErrors = (error?: FormError): boolean =>
        shouldValidate && Boolean(error)

    const formInitialValues: RateWithdrawValues = {
        rateWithdrawReason: '',
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
        rate?.packageSubmissions?.[0]?.rateRevision.formData
            .rateCertificationName ?? undefined

    const stateHeader = useMemoizedStateHeader({
        subHeaderText: rateCertificationName,
        stateCode: rate?.state.code,
        stateName: rate?.state.name,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent('RateWithdrawForm')
    }, [updateActiveMainContent])

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    } else if (!rate || !rate.packageSubmissions) {
        return <GenericErrorPage />
    }

    const withdrawRateAction = async (values: RateWithdrawValues) => {
        logFormSubmitEvent({
            heading: 'Withdraw rate',
            form_name: 'Withdraw rate',
            event_name: 'form_field_submit',
            link_type: 'link_other',
        })
        try {
            await withdrawRate({
                variables: {
                    input: {
                        rateID: rate.id,
                        updatedReason: values.rateWithdrawReason,
                    },
                },
            })
            navigate(`/rates/${id}`)
        } catch (err) {
            recordJSException(
                `WithdrawRate: GraphQL error reported. Error message: Failed to create form data ${err}`
            )
        }
    }

    return (
        <div className={styles.rateWithdrawContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_RATES,
                        text: 'Dashboard',
                    },
                    { link: `/rates/${id}`, text: rateCertificationName || '' },
                    {
                        text: 'Withdraw rate',
                        link: generatePath(RoutesRecord.RATE_WITHDRAW, { id }),
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => withdrawRateAction(values)}
                validationSchema={RateWithdrawSchema}
            >
                {({ handleSubmit, handleChange, errors, values }) => (
                    <Form
                        id="RateWithdrawForm"
                        className={styles.formContainer}
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {withdrawError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <h2>Withdraw a rate</h2>
                            <FieldTextarea
                                label="Reason for withdrawing"
                                id="rateWithdrawReason"
                                data-testid="rateWithdrawReason"
                                showError={showFieldErrors(
                                    errors.rateWithdrawReason
                                )}
                                name="rateWithdrawReason"
                                aria-required
                                hint="Provide a reason for withdrawing the rate review."
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
                                    link_url={`/rates/${id}`}
                                    onClick={() => navigate(`/rates/${id}`)}
                                >
                                    Cancel
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    disabled={showFieldErrors(
                                        errors.rateWithdrawReason
                                    )}
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={`/rates/${id}`}
                                    animationTimeout={1000}
                                    loading={withdrawLoading}
                                >
                                    Withdraw rate
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

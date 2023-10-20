import React, { useState } from 'react'
import { Form as UswdsForm, ButtonGroup } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { FieldTextInput } from '../../components/Form'
import { MccrsIdFormSchema } from './MccrsIdSchema'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import { useNavigate, useParams } from 'react-router-dom'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { ActionButton } from '../../components/ActionButton'
import {
    HealthPlanPackage,
    useUpdateContractMutation,
} from '../../gen/gqlClient'
import styles from './MccrsId.module.scss'

export interface MccrsIdFormValues {
    mccrsId: number | undefined
}
type FormError =
    FormikErrors<MccrsIdFormValues>[keyof FormikErrors<MccrsIdFormValues>]

type RouteParams = {
    id: string
}

export const MccrsId = ({
    showValidations = false,
}: {
    showValidations: boolean
}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const { id } = useParams<keyof RouteParams>()
    const navigate = useNavigate()

    const mccrsIDInitialValues: MccrsIdFormValues = {
        mccrsId: undefined,
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic of true

    const [updateFormData] = useUpdateContractMutation()
    const handleFormSubmit = async (
        values: MccrsIdFormValues
    ): Promise<HealthPlanPackage | Error> => {
        setShowPageErrorMessage(false)
        try {
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        mccrsID: values?.mccrsId?.toString(),
                        id: id || '',
                    },
                },
            })

            const updatedSubmission: HealthPlanPackage | undefined =
                updateResult?.data?.updateContract.pkg

            if (!updatedSubmission) {
                setShowPageErrorMessage(true)

                console.info('Failed to update form data', updateResult)
                recordJSException(
                    `MCCRSIDForm: Apollo error reported. Error message: Failed to update form data ${updateResult}`
                )
                return new Error('Failed to update form data')
            } else if (updatedSubmission) {
                navigate(`/submissions/${updatedSubmission.id}`)
                return updatedSubmission
            }
            return updatedSubmission
        } catch (serverError) {
            setShowPageErrorMessage(true)
            recordJSException(
                `MCCRSIDForm: Apollo error reported. Error message: ${serverError.message}`
            )
            return new Error(serverError)
        }
    }

    return (
        <>
            {showPageErrorMessage && <GenericApiErrorBanner />}
            <Formik
                initialValues={mccrsIDInitialValues}
                onSubmit={(values) => {
                    return handleFormSubmit(values)
                }}
                validationSchema={() => MccrsIdFormSchema()}
            >
                {({ values, errors, handleSubmit, isSubmitting }) => (
                    <>
                        <UswdsForm
                            className={styles.formContainer}
                            id="MCCRSIDForm"
                            aria-label="MCCRS ID Form"
                            aria-describedby="form-guidance"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                handleSubmit(e)
                            }}
                        >
                            <fieldset className="usa-fieldset">
                                <h3>MC-CRS record number</h3>
                                <legend className="srOnly">
                                    Add MC-CRS record number
                                </legend>
                                <FieldTextInput
                                    name={'mccrsId'}
                                    id={'mccrsId'}
                                    label="Enter the Managed Care Contract and Rate Review System (MC-CRS) record number."
                                    showError={Boolean(
                                        showFieldErrors(errors.mccrsId)
                                    )}
                                    type="text"
                                    variant="SUBHEAD"
                                    aria-required
                                    hint={
                                        <span>
                                            (i.e <span>4375</span>)
                                        </span>
                                    }
                                />
                            </fieldset>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    secondary
                                    data-testid="page-actions-left-secondary"
                                    onClick={() => console.info('delete')}
                                >
                                    Delete Number
                                </ActionButton>

                                <ActionButton
                                    type="submit"
                                    variant="default"
                                    data-testid="page-actions-right-primary"
                                    disabled={
                                        shouldValidate && !!errors.mccrsId
                                    }
                                    onSubmit={() => handleFormSubmit(values)}
                                    animationTimeout={1000}
                                    loading={
                                        isSubmitting &&
                                        shouldValidate &&
                                        !errors.mccrsId
                                    }
                                >
                                    Save MC-CRS number
                                </ActionButton>
                            </ButtonGroup>
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}

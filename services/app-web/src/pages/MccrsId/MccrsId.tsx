import React, { useState } from 'react'
import { Form as UswdsForm, ButtonGroup, Button } from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers } from 'formik'
import { FieldTextInput } from '../../components/Form'
import { ActionButton } from '../../components/ActionButton'
import { MccrsIdFormSchema } from './MccrsIdSchema'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'

import {
    User,
    HealthPlanPackage,
    UpdateInformation,
    useUpdateContractMutation,
    UpdateContractInput
} from '../../gen/gqlClient'
import styles from './MccrsId.module.scss'

export interface MccrsIdFormValues {
    mccrsId: number | undefined
}
type FormError =
    FormikErrors<MccrsIdFormValues>[keyof FormikErrors<MccrsIdFormValues>]

type RouteParams = {
    submissionId: string
}
export const MccrsId = ({
    mccrsId,
    showValidations = false,
}: {mccrsId: string, showValidations: boolean}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const { submissionId } = useParams<keyof RouteParams>()

    const mccrsIDInitialValues: MccrsIdFormValues = {
        mccrsId: Number(mccrsId),
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const [showPageErrorMessage, setShowPageErrorMessage] = useState<
    boolean | string
    >(false) // string is a custom error message, defaults to generic of true

    const [updateFormData] = useUpdateContractMutation()
    const handleFormSubmit = async (values: MccrsIdFormValues): Promise<HealthPlanPackage | Error> => {
        setShowPageErrorMessage(false)
        try {
            const updateResult = await updateFormData({
                variables: {
                    input: {
                        mccrsID: values?.mccrsId?.toString(),
                        // id: submissionId
                        id: '217f8e1e-1b09-4d4a-92b9-189d2dbb1c63'
                    },
                },
            })
            const updatedSubmission: HealthPlanPackage | undefined =
                updateResult?.data?.updateContract.pkg
            console.log(updatedSubmission)
            if (!updatedSubmission) {
                setShowPageErrorMessage(true)
                console.info('Failed to update form data', updateResult)
                recordJSException(
                    `MCCRSIDForm: Apollo error reported. Error message: Failed to update form data ${updateResult}`
                )
                return new Error('Failed to update form data')
            }
            console.log(updatedSubmission)
            return updatedSubmission
        } catch (serverError) {
            setShowPageErrorMessage(true)
            recordJSException(
                `MCCRSIDForm: Apollo error reported. Error message: ${serverError.message}`
            )
            console.log(serverError)
            return new Error(serverError)
        }
    }
     
    return (
        <Formik
            initialValues={mccrsIDInitialValues}
            onSubmit={(values) => {
                return handleFormSubmit(values)
            }}
            validationSchema={() => MccrsIdFormSchema()}
        >
            {({
                values,
                errors,
                handleSubmit,
                setSubmitting,
                isSubmitting,
                setFieldValue,
            }) => (
                <>
                    <UswdsForm
                        className={styles.formContainer}
                        id="ContractDetailsForm"
                        aria-label="Contract Details Form"
                        aria-describedby="form-guidance"
                        onSubmit={(e) => {
                            setShouldValidate(true)
                            // setFocusErrorSummaryHeading(true)
                            handleSubmit(e)
                        }}
                    >
                        <fieldset className="usa-fieldset">
                            <h3>MC-CRS record number</h3>
                            <legend className="srOnly">
                                Add MC-CRS record number
                            </legend>

                            {/* {shouldValidate && (
                            <ErrorSummary
                                errors={
                                    documentsErrorMessage
                                        ? {
                                              [documentsErrorKey]:
                                                  documentsErrorMessage,
                                              ...errors,
                                          }
                                        : errors
                                }
                                headingRef={errorSummaryHeadingRef}
                            />
                        )} */}
                            <FieldTextInput
                                name={'mccrsId'}
                                id={'mccrsId'}
                                label="Enter the Managed Care Contract and Rate Review System (MC-CRS) record number."
                                // showError={true}
                                showError={Boolean(
                                    showFieldErrors(errors.mccrsId)
                                )}
                                type="text"
                                variant="SUBHEAD"
                                aria-required
                                hint={(<span>(i.e <span>4375</span>)</span>)}
                            />
                        </fieldset>
                        <ButtonGroup type="default">
                            <ActionButton
                                type="button"
                                variant="outline"
                                secondary
                                data-testid="page-actions-left-secondary"
                                // disabled={actionInProgress}
                                onClick={() => console.info('click')}
                                // onClick={actionInProgress ? undefined : backOnClick}
                            >
                                Delete Number
                            </ActionButton>

                            <ActionButton
                                type="submit"
                                // variant="default"
                                data-testid="page-actions-right-primary"
                                // disabled={disableContinue}
                                onSubmit={() => handleFormSubmit(values)}
                                // animationTimeout={1000}
                                // loading={actionInProgress && !disableContinue}
                            >
                                Save MC-CRS number
                            </ActionButton>
                        </ButtonGroup>
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

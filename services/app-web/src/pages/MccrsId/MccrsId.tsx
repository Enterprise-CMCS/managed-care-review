import React from 'react'
import { Form as UswdsForm, ButtonGroup } from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers } from 'formik'
import { FieldTextInput } from '../../components/Form'
import { ActionButton } from '../../components/ActionButton'
import { MccrsIdFormSchema } from './MccrsIdSchema'

import styles from './MccrsId.module.scss'

export interface MccrsIdFormValues {
    mccrsId: number | undefined
}
type FormError =
    FormikErrors<MccrsIdFormValues>[keyof FormikErrors<MccrsIdFormValues>]

export const MccrsId = ({
    mccrsId,
    showValidations = false,
}: {mccrsId: string, showValidations: boolean}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)

    const mccrsIDInitialValues: MccrsIdFormValues = {
        mccrsId: 1232,
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

        const handleFormSubmit = async (
            values: MccrsIdFormValues,
            formikHelpers: FormikHelpers<MccrsIdFormValues>
        ) => {
           
            try {
                    formikHelpers.setSubmitting(false)

                // const updatedSubmission = await updateDraft(draftSubmission)
                // if (updatedSubmission instanceof Error) {
                //     formikHelpers.setSubmitting(false)
                //     redirectToDashboard.current = false
                //     console.info(
                //         'Error updating draft submission: ',
                //         updatedSubmission
                //     )
                // } else if (updatedSubmission) {
                //     if (redirectToDashboard.current) {
                //         navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                //     } else {
                //         navigate(`../documents`)
                //     }
                // }
            } catch (serverError) {
                formikHelpers.setSubmitting(false)
            }
        }
    return (
        <Formik
            initialValues={mccrsIDInitialValues}
            onSubmit={handleFormSubmit}
            // onSubmit={(values, { setSubmitting }) => {
            //     return handleFormSubmit(values, setSubmitting, {
            //         shouldValidateDocuments: true,
            //         redirectPath:
            //             draftSubmission.submissionType === 'CONTRACT_ONLY'
            //                 ? `../contacts`
            //                 : `../rate-details`,
            //     })
            // }}
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
                        onSubmit={() => 'submitted'}
                        // onSubmit={(e) => {
                        //     setShouldValidate(true)
                        //     setFocusErrorSummaryHeading(true)
                        //     handleSubmit(e)
                        // }}
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
                                hint="(i.e 4375)"
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
                                variant="default"
                                data-testid="page-actions-right-primary"
                                // disabled={disableContinue}
                                onClick={() => console.info('click')}
                                animationTimeout={1000}
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

import React from 'react'
import { Form as UswdsForm, ButtonGroup } from '@trussworks/react-uswds'
import { Formik } from 'formik'
import { FieldTextInput } from '../../components/Form'
import { ActionButton } from '../../components/ActionButton'

import styles from './MCCRSID.module.scss'

export interface MCCRSIDFormValues {
    recordNumber: number | undefined
}
// type FormError =
//     FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const MCCRSID = (): React.ReactElement => {
    const mccrsIDInitialValues: MCCRSIDFormValues = {
        recordNumber: undefined,
    }
    return (
        <Formik
            initialValues={mccrsIDInitialValues}
            onSubmit={() => console.info('submitted')}
            // onSubmit={(values, { setSubmitting }) => {
            //     return handleFormSubmit(values, setSubmitting, {
            //         shouldValidateDocuments: true,
            //         redirectPath:
            //             draftSubmission.submissionType === 'CONTRACT_ONLY'
            //                 ? `../contacts`
            //                 : `../rate-details`,
            //     })
            // }}
            // validationSchema={() => ContractDetailsFormSchema(draftSubmission)}
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
                            <span className={styles.requiredOptionalText}>
                                Required
                            </span>
                            <FieldTextInput
                                name={'mccrsIDRecordNumber'}
                                id={'mccrsIDRecordNumber'}
                                label="Enter the Managed Care Contract and Rate Review System (MC-CRS) record number."
                                showError={false}
                                // showError={Boolean(
                                //     showFieldErrors(getIn(errors, `${fieldNamePrefix}.name`))
                                // )}
                                type="text"
                                variant="SUBHEAD"
                                aria-required
                            />
                        </fieldset>
                        <ButtonGroup type="default">
                            <ActionButton
                                type="button"
                                variant="outline"
                                data-testid="page-actions-left-secondary"
                                // disabled={actionInProgress}
                                onClick={() => console.info('click')}
                                // onClick={actionInProgress ? undefined : backOnClick}
                            >
                                Delete
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
                                {/* {!isLastPage ? 'Continue' : 'Submit'} */}
                            </ActionButton>
                        </ButtonGroup>
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

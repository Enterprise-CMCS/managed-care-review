import React from 'react'
import * as Yup from 'yup'
import dayjs from 'dayjs'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import {
    Alert,
    ErrorMessage,
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    DateRangePicker,
    DatePicker,
    ButtonGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers } from 'formik'
import { NavLink, useHistory } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'

import {
    DraftSubmission,
    RateType,
    useUpdateDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import {
    formatForForm,
    isDateRangeEmpty,
    formatUserInputDate,
    validateDateFormat,
    validateDateRange12Months,
} from '../../../formHelpers'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { FieldCheckbox } from '../../../components/Form/FieldCheckbox/FieldCheckbox'
import { updatesFromSubmission } from '../updateSubmissionTransform'

// Dependency setup
Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)
dayjs.extend(isLeapYear)

// Formik setup
const RateDetailsFormSchema = Yup.object().shape({
    rateType: Yup.string().defined('You must choose a rate certification type'),
    rateDateStart: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter a start date')
        .typeError('The start date must be in MM/DD/YYYY format'),
    rateDateEnd: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter an end date')
        .typeError('The end date must be in MM/DD/YYYY format')
        .min(
            Yup.ref('rateDateStart'),
            'The end date must come after the start date'
        )
        .test(
            'ratingPeriod',
            'You must enter a 12-month rating period',
            validateDateRange12Months
        ),
    rateDateCertified: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter the date the document was certified')
        .typeError('The certified date must be in MM/DD/YYYY format'),
})

type FormError = FormikErrors<RateDetailsFormValues>[keyof FormikErrors<RateDetailsFormValues>]

export interface RateDetailsFormValues {
    rateType: RateType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
}
export const RateDetails = ({
    draftSubmission,
    showValidations = false,
}: {
    draftSubmission: DraftSubmission
    showValidations?: boolean
}): React.ReactElement => {
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const history = useHistory()
    const [
        updateDraftSubmission,
        { error: updateError },
    ] = useUpdateDraftSubmissionMutation()

    if (updateError && !showFormAlert) {
        setShowFormAlert(true)
        console.log(
            'Log: updating submission failed with gql error',
            updateError
        )
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const rateDetailsInitialValues: RateDetailsFormValues = {
        rateType: draftSubmission?.rateType ?? undefined,
        rateDateStart:
            (draftSubmission && formatForForm(draftSubmission.rateDateStart)) ??
            '',
        rateDateEnd:
            (draftSubmission && formatForForm(draftSubmission.rateDateEnd)) ??
            '',
        rateDateCertified:
            (draftSubmission &&
                formatForForm(draftSubmission.rateDateCertified)) ??
            '',
    }

    const isRateTypeEmpty = (values: RateDetailsFormValues): boolean =>
        values.rateType === undefined

    const isRateTypeAmendment = (values: RateDetailsFormValues): boolean =>
        values.rateType === 'AMENDMENT'

    const handleFormSubmit = async (
        values: RateDetailsFormValues,
        formikHelpers: FormikHelpers<RateDetailsFormValues>
    ) => {
        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.rateType = values.rateType
        updatedDraft.rateDateStart = values.rateDateStart
        updatedDraft.rateDateEnd = values.rateDateEnd
        updatedDraft.rateDateCertified = values.rateDateCertified

        try {
            const updateResult = await updateDraftSubmission({
                variables: {
                    input: {
                        submissionID: draftSubmission.id,
                        draftSubmissionUpdates: updatedDraft,
                    },
                },
            })
            const updatedSubmission: DraftSubmission | undefined =
                updateResult?.data?.updateDraftSubmission.draftSubmission

            if (updatedSubmission) {
                history.push(`/submissions/${draftSubmission.id}/documents`)
            } else {
                setShowFormAlert(true)
            }
        } catch (serverError) {
            setShowFormAlert(true)
            formikHelpers.setSubmitting(false)
        }
    }

    const RateDatesErrorMessage = ({
        values,
        validationErrorMessage,
    }: {
        values: RateDetailsFormValues
        validationErrorMessage: string
    }): React.ReactElement => (
        <ErrorMessage>
            {isDateRangeEmpty(values.rateDateStart, values.rateDateEnd)
                ? 'You must provide a start and an end date'
                : validationErrorMessage}
        </ErrorMessage>
    )

    return (
        <>
            <Formik
                initialValues={rateDetailsInitialValues}
                onSubmit={handleFormSubmit}
                validationSchema={RateDetailsFormSchema}
            >
                {({
                    values,
                    errors,
                    handleSubmit,
                    isSubmitting,
                    isValidating,
                    setFieldValue,
                    validateForm,
                }) => (
                    <>
                        <UswdsForm
                            className={styles.formContainer}
                            id="RateDetailsForm"
                            aria-label="Rate Details Form"
                            onSubmit={(e) => {
                                e.preventDefault()
                                validateForm().catch(() =>
                                    console.warn('Log: Validation Error')
                                )
                                if (!isValidating) handleSubmit()
                            }}
                        >
                            <fieldset className="usa-fieldset">
                                <legend className="srOnly">Rate Details</legend>
                                {showFormAlert && (
                                    <Alert type="error">
                                        Something went wrong
                                    </Alert>
                                )}
                                <span>All fields are required</span>
                                <FormGroup
                                    error={showFieldErrors(errors.rateType)}
                                >
                                    <Fieldset
                                        className={styles.radioGroup}
                                        legend="Rate certification type"
                                    >
                                        {showFieldErrors(errors.rateType) && (
                                            <ErrorMessage>
                                                {errors.rateType}
                                            </ErrorMessage>
                                        )}
                                        <FieldRadio
                                            id="newRate"
                                            name="rateType"
                                            label="New rate certification"
                                            value={'NEW'}
                                            checked={values.rateType === 'NEW'}
                                            aria-required
                                        />
                                        <FieldRadio
                                            id="amendmentRate"
                                            name="rateType"
                                            label="Amendment to prior rate certification"
                                            value={'AMENDMENT'}
                                            checked={
                                                values.rateType === 'AMENDMENT'
                                            }
                                            aria-required
                                        />
                                    </Fieldset>
                                </FormGroup>

                                {!isRateTypeEmpty(values) && (
                                    <>
                                        <FormGroup
                                            error={
                                                showFieldErrors(
                                                    errors.rateDateStart
                                                ) ||
                                                showFieldErrors(
                                                    errors.rateDateEnd
                                                )
                                            }
                                        >
                                            <Fieldset
                                                legend={
                                                    isRateTypeAmendment(values)
                                                        ? 'Rating period of original rate certification'
                                                        : 'Rating period'
                                                }
                                            >
                                                {showFieldErrors(
                                                    errors.rateDateStart ||
                                                        errors.rateDateEnd
                                                ) && (
                                                    <RateDatesErrorMessage
                                                        values={values}
                                                        validationErrorMessage={
                                                            errors.rateDateStart ||
                                                            errors.rateDateEnd ||
                                                            'Invalid date'
                                                        }
                                                    />
                                                )}

                                                <DateRangePicker
                                                    className={
                                                        styles.dateRangePicker
                                                    }
                                                    startDateHint="mm/dd/yyyy"
                                                    startDateLabel="Start date"
                                                    startDatePickerProps={{
                                                        disabled: false,
                                                        id: 'rateDateStart',
                                                        name: 'rateDateStart',
                                                        defaultValue:
                                                            values.rateDateStart,
                                                        onChange: (val) =>
                                                            setFieldValue(
                                                                'rateDateStart',
                                                                formatUserInputDate(
                                                                    val
                                                                )
                                                            ),
                                                    }}
                                                    endDateHint="mm/dd/yyyy"
                                                    endDateLabel="End date"
                                                    endDatePickerProps={{
                                                        disabled: false,
                                                        id: 'rateDateEnd',
                                                        name: 'rateDateEnd',
                                                        defaultValue:
                                                            values.rateDateEnd,
                                                        onChange: (val) =>
                                                            setFieldValue(
                                                                'rateDateEnd',
                                                                formatUserInputDate(
                                                                    val
                                                                )
                                                            ),
                                                    }}
                                                />
                                            </Fieldset>
                                        </FormGroup>
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.rateDateCertified
                                            )}
                                        >
                                            <Label
                                                htmlFor="rateDateCertified"
                                                id="rateDateCertifiedLabel"
                                            >
                                                Date certified
                                            </Label>
                                            <div
                                                className="usa-hint"
                                                id="rateDateCertifiedHint"
                                            >
                                                mm/dd/yyyy
                                            </div>
                                            {showFieldErrors(
                                                errors.rateDateCertified
                                            ) && (
                                                <ErrorMessage>
                                                    {errors.rateDateCertified}
                                                </ErrorMessage>
                                            )}
                                            <DatePicker
                                                aria-required
                                                aria-describedby="rateDateCertifiedLabel rateDateCertifiedHint"
                                                id="rateDateCertified"
                                                name="rateDateCertified"
                                                defaultValue={
                                                    values.rateDateCertified
                                                }
                                                onChange={(val) =>
                                                    setFieldValue(
                                                        'rateDateCertified',
                                                        formatUserInputDate(val)
                                                    )
                                                }
                                            />
                                        </FormGroup>

                                        {isRateTypeAmendment(values) && (
                                            <>
                                                <FormGroup>
                                                    <Fieldset legend="Effective dates of rate amendment">
                                                        <FieldCheckbox
                                                            name="sameAsOriginalRatePeriod"
                                                            label="Use same dates as original rating period"
                                                            id="sameAsOriginalRatePeriod"
                                                        />
                                                        <DateRangePicker
                                                            className={
                                                                styles.dateRangePicker
                                                            }
                                                            endDateHint="mm/dd/yyyy"
                                                            endDateLabel="End date"
                                                            endDatePickerProps={{
                                                                disabled: false,
                                                                id:
                                                                    'amendmentRateDateEnd',
                                                                name:
                                                                    'amendmentRateDateEnd',
                                                            }}
                                                            startDateHint="mm/dd/yyyy"
                                                            startDateLabel="Start date"
                                                            startDatePickerProps={{
                                                                disabled: false,
                                                                id:
                                                                    'amendmentRateDateStart',
                                                                name:
                                                                    'amendmentRateDateEnd',
                                                            }}
                                                        />
                                                    </Fieldset>
                                                </FormGroup>
                                                <FormGroup>
                                                    <Label
                                                        htmlFor="amendment-certification-date"
                                                        id="amendmentCertificationDateLabel"
                                                    >
                                                        Date certified for rate
                                                        amendment
                                                    </Label>
                                                    <div
                                                        className="usa-hint"
                                                        id="amendmentCertificationDateHint"
                                                    >
                                                        mm/dd/yyyy
                                                    </div>
                                                    <DatePicker
                                                        aria-describedby="amendmentCertificationDateLabel amendmentCertificationDateHint"
                                                        id="amendmentCertificationDate"
                                                        name="amendment-certification-date"
                                                    />
                                                </FormGroup>
                                            </>
                                        )}
                                    </>
                                )}
                            </fieldset>
                            <ButtonGroup className={styles.buttonGroup}>
                                <Link
                                    asCustom={NavLink}
                                    className={`${styles.outlineButtonLink} usa-button usa-button--outline`}
                                    variant="unstyled"
                                    to="/dashboard"
                                >
                                    Cancel
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={() => setShouldValidate(true)}
                                >
                                    Continue
                                </Button>
                            </ButtonGroup>
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}

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
            (value: string, context: Yup.TestContext) =>
                validateDateRange12Months(
                    context.parent.rateDateStart,
                    context.parent.rateDateEnd
                )
        ),
    rateDateCertified: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter the date the document was certified')
        .typeError('The certified date must be in MM/DD/YYYY format'),
    effectiveDateStart: Yup.date().when('rateType', {
        is: 'AMENDMENT',
        then: Yup.date()
            .nullable()
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .defined('You must enter a start date')
            .typeError('The start date must be in MM/DD/YYYY format'),
    }),
    effectiveDateEnd: Yup.date().when('rateType', {
        is: 'AMENDMENT',
        then: Yup.date()
            .nullable()
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .defined('You must enter an end date')
            .typeError('The end date must be in MM/DD/YYYY format')
            .min(
                Yup.ref('effectiveDateStart'),
                'The end date must come after the start date'
            )
            .test(
                'ratingPeriod',
                'You must enter a 12-month rating period',
                (value: string, context: Yup.TestContext) =>
                    validateDateRange12Months(
                        context.parent.effectiveDateStart,
                        context.parent.effectiveDateEnd
                    )
            ),
    }),
})

type FormError = FormikErrors<RateDetailsFormValues>[keyof FormikErrors<RateDetailsFormValues>]

export interface RateDetailsFormValues {
    rateType: RateType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
    effectiveDateStart: string
    effectiveDateEnd: string
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
        effectiveDateStart:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.rateAmendmentInfo?.effectiveDateStart
                )) ??
            '',
        effectiveDateEnd:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.rateAmendmentInfo?.effectiveDateEnd
                )) ??
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

        if (values.rateType === 'AMENDMENT') {
            updatedDraft.rateAmendmentInfo = {
                effectiveDateStart: values.effectiveDateStart,
                effectiveDateEnd: values.effectiveDateEnd,
            }
        } else {
            updatedDraft.rateAmendmentInfo = null
        }

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
        startDate,
        endDate,
        validationErrorMessage,
    }: {
        startDate: string
        endDate: string
        validationErrorMessage: string
    }): React.ReactElement => (
        <ErrorMessage>
            {isDateRangeEmpty(startDate, endDate)
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
                    handleChange,
                    handleSubmit,
                    isSubmitting,
                    isValidating,
                    setFieldValue,
                    setValues,
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
                                                        startDate={
                                                            values.rateDateStart
                                                        }
                                                        endDate={
                                                            values.rateDateEnd
                                                        }
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
                                                {isRateTypeAmendment(values)
                                                    ? 'Date certified for rate amendment'
                                                    : 'Date certified'}
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
                                                        {showFieldErrors(
                                                            errors.effectiveDateStart ||
                                                                errors.effectiveDateEnd
                                                        ) && (
                                                            <RateDatesErrorMessage
                                                                startDate={
                                                                    values.effectiveDateStart
                                                                }
                                                                endDate={
                                                                    values.effectiveDateEnd
                                                                }
                                                                validationErrorMessage={
                                                                    errors.effectiveDateStart ||
                                                                    errors.effectiveDateEnd ||
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
                                                                id:
                                                                    'effectiveDateStart',
                                                                name:
                                                                    'effectiveDateStart',
                                                                defaultValue:
                                                                    values.effectiveDateStart,
                                                                onChange: (
                                                                    val
                                                                ) =>
                                                                    setFieldValue(
                                                                        'effectiveDateStart',
                                                                        formatUserInputDate(
                                                                            val
                                                                        )
                                                                    ),
                                                            }}
                                                            endDateHint="mm/dd/yyyy"
                                                            endDateLabel="End date"
                                                            endDatePickerProps={{
                                                                disabled: false,
                                                                id:
                                                                    'effectiveDateEnd',
                                                                name:
                                                                    'effectiveDateEnd',
                                                                defaultValue:
                                                                    values.effectiveDateEnd,
                                                                onChange: (
                                                                    val
                                                                ) =>
                                                                    setFieldValue(
                                                                        'effectiveDateEnd',
                                                                        formatUserInputDate(
                                                                            val
                                                                        )
                                                                    ),
                                                            }}
                                                        />
                                                    </Fieldset>
                                                </FormGroup>
                                            </>
                                        )}
                                    </>
                                )}
                            </fieldset>
                            <div className={styles.pageActions}>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={() => setShouldValidate(true)}
                                    unstyled
                                >
                                    Save as Draft
                                </Button>
                                <ButtonGroup
                                    type="default"
                                    className={styles.buttonGroup}
                                >
                                    <Link
                                        asCustom={NavLink}
                                        className="usa-button usa-button--outline"
                                        variant="unstyled"
                                        to={`contract-details`}
                                    >
                                        Back
                                    </Link>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        onClick={() => setShouldValidate(true)}
                                    >
                                        Continue
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}

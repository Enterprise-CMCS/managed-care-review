import React, { useEffect, useState } from 'react'
import { Formik, FormikErrors } from 'formik'
import {
    Fieldset,
    Form as UswdsForm,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import {
    DynamicStepIndicator,
    ErrorSummary,
    FieldCheckbox,
    FieldRadio,
    FieldTextInput,
    FieldYesNo,
    FormContainer,
    FormNotificationContainer,
    PageActions,
    PoliteErrorMessage,
    ProgramSelect,
} from '../../../../components'
import { ContactSupportLink } from '../../../../components/ErrorAlert/ContactSupportLink'
import { CustomDateRangePicker } from '../../../../components/Form/CustomDateRangePicker/CustomDateRangePicker'
import { usePage } from '../../../../contexts/PageContext'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { RoutesRecord } from '@mc-review/constants'
import { useNavigate } from 'react-router-dom'
import styles from '../../StateSubmissionForm.module.scss'
import { SDPSubmissionDetailsSchema } from './SDPSubmissionDetailsSchema'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'

export type SDPSubmissionDetailsFormValues = {
    submissionType?:
        | 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT'
        | 'AMENDMENT_TO_AN_APPROVED_PREPRINT'
        | 'RENEWAL_FOR_NEW_RATING_PERIOD'
    programIDs: string[]
    changesIncluded: Array<
        | 'RATING_PERIOD'
        | 'PAYMENT_TYPE'
        | 'PROVIDER_TYPE'
        | 'QUALITY_METRICS_OR_BENCHMARKS'
        | 'OTHER'
    >
    ratingPeriodStart: string
    ratingPeriodEnd: string
    estimatedFederalShare: string
    estimatedStateShare: string
    automaticallyRenewed?: 'YES' | 'NO'
}

type FormError =
    FormikErrors<SDPSubmissionDetailsFormValues>[keyof FormikErrors<SDPSubmissionDetailsFormValues>]

const initialValues: SDPSubmissionDetailsFormValues = {
    submissionType: undefined,
    programIDs: [],
    changesIncluded: [],
    ratingPeriodStart: '',
    ratingPeriodEnd: '',
    estimatedFederalShare: '',
    estimatedStateShare: '',
    automaticallyRenewed: undefined,
}

const changeOptions = [
    {
        id: 'ratingPeriod',
        label: 'Rating period',
        value: 'RATING_PERIOD' as const,
    },
    {
        id: 'paymentType',
        label: 'Payment type',
        value: 'PAYMENT_TYPE' as const,
    },
    {
        id: 'providerType',
        label: 'Provider type',
        value: 'PROVIDER_TYPE' as const,
    },
    {
        id: 'qualityMetrics',
        label: 'Quality metrics or benchmarks',
        value: 'QUALITY_METRICS_OR_BENCHMARKS' as const,
    },
    {
        id: 'other',
        label: 'Other',
        value: 'OTHER' as const,
    },
]

const usDateToIsoDate = (value?: string): string => {
    if (!value) return ''
    const [month, day, year] = value.split('/')
    if (!month || !day || !year) return ''
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const formatCurrencyOnBlur = (value: string): string => {
    const trimmedValue = value.trim().replace(/,/g, '')
    const withoutCurrencySymbol = trimmedValue.replace(/^\$/, '')

    if (!withoutCurrencySymbol) {
        return ''
    }

    if (!/^\d+(\.\d{1,2})?$/.test(withoutCurrencySymbol)) {
        return trimmedValue
    }

    return `$${withoutCurrencySymbol}`
}

type SDPSubmissionDetailsProps = {
    initialValues?: SDPSubmissionDetailsFormValues
    onContinue: (values: SDPSubmissionDetailsFormValues) => void | Promise<void>
    pageErrorMessage?: string | boolean
}

export const sdpSubmissionDetailsInitialValues = initialValues

export const SDPSubmissionDetails = ({
    initialValues = sdpSubmissionDetailsInitialValues,
    onContinue,
    pageErrorMessage = false,
}: SDPSubmissionDetailsProps): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { errorSummaryHeadingRef } = useErrorSummary()
    const [shouldValidate, setShouldValidate] = useState(false)

    const activeMainContentId = 'sdpSubmissionDetailsMainContent'

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const formHeading = 'SDP Submission Details Form'

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={[
                        'SUBMISSIONS_TYPE',
                        'SUBMISSIONS_SDP_DETAILS',
                        'SUBMISSIONS_SDP_CONTACTS',
                        'SUBMISSIONS_SDP_REVIEW_SUBMIT',
                    ]}
                    currentFormPage="SUBMISSIONS_TYPE"
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                        SUBMISSIONS_SDP_DETAILS: 'SDP details',
                        SUBMISSIONS_SDP_CONTACTS: 'Contacts',
                        SUBMISSIONS_SDP_REVIEW_SUBMIT: 'Review and submit',
                    }}
                />
                <PageBannerAlerts showPageErrorMessage={pageErrorMessage} />
            </FormNotificationContainer>

            <FormContainer id="SDPSubmissionDetails">
                <Formik
                    initialValues={initialValues}
                    validationSchema={SDPSubmissionDetailsSchema}
                    onSubmit={async (values) => {
                        setShouldValidate(true)
                        await onContinue(values)
                    }}
                >
                    {({ errors, handleSubmit, values, setFieldValue }) => (
                        <UswdsForm
                            className={styles.formContainer}
                            id="SDPSubmissionDetailsForm"
                            aria-label="SDP Submission Details Form"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                return handleSubmit(e)
                            }}
                        >
                            {shouldValidate && (
                                <ErrorSummary
                                    errors={errors}
                                    headingRef={errorSummaryHeadingRef}
                                />
                            )}
                            <fieldset className="usa-fieldset">
                                <legend className="srOnly">
                                    Submission details
                                </legend>
                                <FormGroup
                                    error={showFieldErrors(
                                        errors.submissionType
                                    )}
                                    className="margin-top-0"
                                >
                                    <Fieldset
                                        legend="Submission type"
                                        role="radiogroup"
                                        aria-required
                                        className={styles.radioGroup}
                                    >
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        {showFieldErrors(
                                            errors.submissionType
                                        ) && (
                                            <PoliteErrorMessage formFieldLabel="Submission type">
                                                {
                                                    errors.submissionType as string
                                                }
                                            </PoliteErrorMessage>
                                        )}
                                        <FieldRadio
                                            id="newSdp"
                                            name="submissionType"
                                            label="New state directed payment preprint"
                                            value="NEW_STATE_DIRECTED_PAYMENT_PREPRINT"
                                            list_position={1}
                                            list_options={3}
                                            parent_component_heading="Submission type"
                                            radio_button_title="New state directed payment preprint"
                                        />
                                        <FieldRadio
                                            id="amendmentSdp"
                                            name="submissionType"
                                            label="Amendment to an approved preprint"
                                            value="AMENDMENT_TO_AN_APPROVED_PREPRINT"
                                            list_position={2}
                                            list_options={3}
                                            parent_component_heading="Submission type"
                                            radio_button_title="Amendment to an approved preprint"
                                        />
                                        <FieldRadio
                                            id="renewalSdp"
                                            name="submissionType"
                                            label="Renewal for new rating period"
                                            value="RENEWAL_FOR_NEW_RATING_PERIOD"
                                            list_position={3}
                                            list_options={3}
                                            parent_component_heading="Submission type"
                                            radio_button_title="Renewal for new rating period"
                                        />
                                    </Fieldset>
                                </FormGroup>

                                <FormGroup
                                    error={showFieldErrors(errors.programIDs)}
                                >
                                    <Label htmlFor="programIDs">
                                        Programs this action covers
                                    </Label>
                                    <div role="note">
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        <ContactSupportLink
                                            alternateText="Contact the Help Desk to edit state programs list"
                                            variant="external"
                                        />
                                    </div>
                                    {showFieldErrors(errors.programIDs) && (
                                        <PoliteErrorMessage formFieldLabel="Programs this action covers">
                                            {errors.programIDs as string}
                                        </PoliteErrorMessage>
                                    )}
                                    <ProgramSelect
                                        name="programIDs"
                                        inputId="programIDs"
                                        programIDs={values.programIDs}
                                        contractProgramsOnly
                                        aria-label="Programs this action covers (required)"
                                        label="Programs this action covers"
                                    />
                                </FormGroup>

                                <FormGroup
                                    error={showFieldErrors(
                                        errors.changesIncluded
                                    )}
                                >
                                    <Fieldset
                                        legend="Changes included in this preprint"
                                        aria-required
                                    >
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        <div className="usa-hint">
                                            <span>Check all that apply</span>
                                        </div>
                                        {showFieldErrors(
                                            errors.changesIncluded
                                        ) && (
                                            <PoliteErrorMessage formFieldLabel="Changes included in this preprint">
                                                {
                                                    errors.changesIncluded as string
                                                }
                                            </PoliteErrorMessage>
                                        )}
                                        {changeOptions.map((option) => (
                                            <FieldCheckbox
                                                key={option.id}
                                                id={option.id}
                                                name="changesIncluded"
                                                label={option.label}
                                                value={option.value}
                                                heading="Changes included in this preprint"
                                                parent_component_heading={
                                                    formHeading
                                                }
                                            />
                                        ))}
                                    </Fieldset>
                                </FormGroup>

                                <FormGroup
                                    error={Boolean(
                                        showFieldErrors(
                                            errors.ratingPeriodStart
                                        ) ||
                                        showFieldErrors(errors.ratingPeriodEnd)
                                    )}
                                >
                                    <Fieldset
                                        legend="Rating period for which this payment arrangement will apply"
                                        aria-required
                                    >
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        <CustomDateRangePicker
                                            startDateLabel="Start date"
                                            startDateHint="mm/dd/yyyy"
                                            startDatePickerProps={{
                                                id: 'ratingPeriodStart',
                                                name: 'ratingPeriodStart',
                                                defaultValue:
                                                    values.ratingPeriodStart ||
                                                    undefined,
                                                onChange: (value) =>
                                                    void setFieldValue(
                                                        'ratingPeriodStart',
                                                        usDateToIsoDate(value)
                                                    ),
                                            }}
                                            endDateLabel="End date"
                                            endDateHint="mm/dd/yyyy"
                                            endDatePickerProps={{
                                                id: 'ratingPeriodEnd',
                                                name: 'ratingPeriodEnd',
                                                defaultValue:
                                                    values.ratingPeriodEnd ||
                                                    undefined,
                                                onChange: (value) =>
                                                    void setFieldValue(
                                                        'ratingPeriodEnd',
                                                        usDateToIsoDate(value)
                                                    ),
                                            }}
                                            startDateError={
                                                showFieldErrors(
                                                    errors.ratingPeriodStart
                                                )
                                                    ? (errors.ratingPeriodStart as string)
                                                    : undefined
                                            }
                                            endDateError={
                                                showFieldErrors(
                                                    errors.ratingPeriodEnd
                                                )
                                                    ? (errors.ratingPeriodEnd as string)
                                                    : undefined
                                            }
                                        />
                                    </Fieldset>
                                </FormGroup>

                                <Fieldset
                                    style={{ marginTop: '24px' }}
                                    legend="Estimated dollar amount"
                                >
                                    <FieldTextInput
                                        id="estimatedFederalShare"
                                        name="estimatedFederalShare"
                                        label="Estimated federal share"
                                        type="text"
                                        onBlur={(e) =>
                                            void setFieldValue(
                                                'estimatedFederalShare',
                                                formatCurrencyOnBlur(
                                                    e.currentTarget.value
                                                )
                                            )
                                        }
                                        showError={showFieldErrors(
                                            errors.estimatedFederalShare
                                        )}
                                    />
                                    <FieldTextInput
                                        id="estimatedStateShare"
                                        name="estimatedStateShare"
                                        label="Estimated state share"
                                        type="text"
                                        onBlur={(e) =>
                                            void setFieldValue(
                                                'estimatedStateShare',
                                                formatCurrencyOnBlur(
                                                    e.currentTarget.value
                                                )
                                            )
                                        }
                                        showError={showFieldErrors(
                                            errors.estimatedStateShare
                                        )}
                                    />
                                </Fieldset>

                                <FormGroup
                                    error={showFieldErrors(
                                        errors.automaticallyRenewed
                                    )}
                                >
                                    <FieldYesNo
                                        id="automaticallyRenewed"
                                        name="automaticallyRenewed"
                                        label="Is this payment arrangement renewed automatically?"
                                        aria-required
                                        showError={showFieldErrors(
                                            errors.automaticallyRenewed
                                        )}
                                    />
                                </FormGroup>
                            </fieldset>

                            <PageActions
                                pageVariant="FIRST"
                                backOnClick={() =>
                                    navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                                }
                                backOnClickUrl={
                                    RoutesRecord.DASHBOARD_SUBMISSIONS
                                }
                                continueOnClick={() => setShouldValidate(true)}
                            />
                        </UswdsForm>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}

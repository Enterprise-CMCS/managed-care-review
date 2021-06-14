import React from 'react'
import * as Yup from 'yup'
import dayjs from 'dayjs'
import {
    Alert,
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    DateRangePicker,
    ButtonGroup,
    ErrorMessage,
} from '@trussworks/react-uswds'
import { Link as ReactRouterLink, NavLink, useHistory } from 'react-router-dom'
import { Formik, FormikHelpers, FormikErrors } from 'formik'

import PageHeading from '../../../components/PageHeading'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { FieldCheckbox } from '../../../components/Form/FieldCheckbox/FieldCheckbox'
import { FieldTextInput } from '../../../components/Form/FieldTextInput/FieldTextInput'
import {
    DraftSubmission,
    ContractType,
    FederalAuthority,
    CapitationRatesAmendedInfo,
    CapitationRatesAmendmentReason,
    useUpdateDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import styles from '../StateSubmissionForm.module.scss'
import {
    CapitationRateReason,
    ManagedCareEntity,
} from '../../../common-code/domain-models/DraftSubmissionType'
import { updatesFromSubmission } from '../updateSubmissionTransform'

function nullOrValue(attribute: string): string | null {
    if (attribute === '') {
        return null
    }
    return attribute
}

// Formik setup
// Should be listed in order of appearance on field to allow errors to focus as expected
const ContractDetailsFormSchema = Yup.object().shape({
    contractType: Yup.string().defined(
        'You must choose a contract action type'
    ),
    contractDateStart: Yup.date().defined('You must enter a start date'),
    contractDateEnd: Yup.date()
        .transform(function (_, originalValue) {
            const dayjsValue = dayjs(originalValue)
            // when valid return date object, otherwise return `InvalidDate`
            return dayjsValue.isValid() ? dayjsValue.toDate() : new Date('')
        })
        .typeError('Invalid date')
        .defined('You must enter an end date')
        .min(
            Yup.ref('contractDateStart'),
            'The end date must come after the start date'
        ),
    managedCareEntities: Yup.array().min(
        1,
        'You must select at least one entity'
    ),
    // itemsAmended: Yup.array().min(1, 'You must select at least one item'),
    federalAuthorities: Yup.array().min(1, 'You must select at least one item'),
    itemsAmended: Yup.array().when('contractType', {
        is: ContractType.Amendment,
        then: Yup.array().min(1, 'You must select at least one item'),
    }),
    itemsAmendedOther: Yup.string().when('itemsAmended', {
        is: (items: string[]) => items.includes('OTHER'),
        then: Yup.string().defined('You must enter the other item'),
    }),
    capitationRates: Yup.string().when('itemsAmended', {
        is: (items: string[]) => items.includes('CAPITATION_RATES'),
        then: Yup.string()
            .nullable()
            .defined('You must select why capitation rates are changing'),
    }),
    capitationRatesOther: Yup.string().when('capitationRates', {
        is: 'OTHER',
        then: Yup.string().defined('You must enter the other reason'),
    }),
    relatedToCovid19: Yup.string().when('contractType', {
        is: ContractType.Amendment,
        then: Yup.string().defined('You must select yes or no'),
    }),
    relatedToVaccination: Yup.string().when('relatedToCovid19', {
        is: 'YES',
        then: Yup.string().defined('You must select yes or no'),
    }),
})
export interface ContractDetailsFormValues {
    contractType: ContractType | undefined
    contractDateStart: string
    contractDateEnd: string
    managedCareEntities: ManagedCareEntity[]
    itemsAmended: string[]
    itemsAmendedOther: string
    capitationRates: CapitationRatesAmendmentReason | undefined
    capitationRatesOther: string
    relatedToCovid19: string
    relatedToVaccination: string
    federalAuthorities: FederalAuthority[]
}
type FormError = FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const ContractDetails = ({
    draftSubmission,
    showValidations = false,
}: {
    draftSubmission: DraftSubmission
    showValidations?: boolean
}): React.ReactElement => {
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const history = useHistory()

    const ContractDetailsInitialValues: ContractDetailsFormValues = {
        contractType: draftSubmission?.contractType ?? undefined,
        contractDateStart: draftSubmission?.contractDateStart?.toString() ?? '',
        contractDateEnd: draftSubmission?.contractDateEnd?.toString() ?? '',
        managedCareEntities:
            (draftSubmission?.managedCareEntities as ManagedCareEntity[]) ?? [],
        itemsAmended: [],
        itemsAmendedOther: '',
        capitationRates: undefined,
        capitationRatesOther: '',
        relatedToCovid19: '',
        relatedToVaccination: '',
        federalAuthorities: draftSubmission?.federalAuthorities ?? [],
    }

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

    const isContractTypeEmpty = (values: ContractDetailsFormValues): boolean =>
        values.contractType === undefined

    const isContractAmendmentSelected = (
        values: ContractDetailsFormValues
    ): boolean => values.contractType === ContractType.Amendment

    const handleFormSubmit = async (
        values: ContractDetailsFormValues,
        formikHelpers: FormikHelpers<ContractDetailsFormValues>
    ) => {
        const updatedDraft = updatesFromSubmission(draftSubmission)

        updatedDraft.contractType = values.contractType
        updatedDraft.contractDateStart = values.contractDateStart
        updatedDraft.contractDateEnd = values.contractDateEnd
        updatedDraft.managedCareEntities = values.managedCareEntities
        updatedDraft.federalAuthorities = values.federalAuthorities

        if (values.contractType === ContractType.Amendment) {
            const relatedToCovid = values.relatedToCovid19 === 'YES'
            const relatedToVacciene = relatedToCovid
                ? values.relatedToVaccination === 'YES'
                : null

            const amendedOther = nullOrValue(values.itemsAmendedOther)

            let capitationInfo: CapitationRatesAmendedInfo | null = null
            if (values.itemsAmended.includes('CAPITATION_RATES')) {
                const capRates: CapitationRatesAmendmentReason | null =
                    values.capitationRates === undefined
                        ? null
                        : values.capitationRates

                capitationInfo = {
                    reason: capRates,
                    reasonOther: nullOrValue(values.capitationRatesOther),
                }
            }

            updatedDraft.contractAmendmentInfo = {
                itemsBeingAmended: values.itemsAmended,
                itemsBeingAmendedOther: amendedOther,
                capitationRatesAmendedInfo: capitationInfo,
                relatedToCovid19: relatedToCovid,
                relatedToVaccination: relatedToVacciene,
            }
        }

        console.log('UPDATING DRAFT', values)

        try {
            console.log('UPPP')
            const updater = await updateDraftSubmission({
                variables: {
                    input: {
                        submissionID: draftSubmission.id,
                        draftSubmissionUpdates: updatedDraft,
                    },
                },
            })

            console.log('usccessss??', updater)

            history.push(`/submissions/${draftSubmission.id}/rate-details`)
        } catch (serverError) {
            console.log('GOT ERER', serverError)
            setShowFormAlert(true)
            formikHelpers.setSubmitting(false)
        }
    }

    return (
        <Formik
            initialValues={ContractDetailsInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={ContractDetailsFormSchema}
            validateOnChange={shouldValidate}
            validateOnBlur={shouldValidate}
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
                    <PageHeading
                        className={styles.formHeader}
                        headingLevel="h2"
                    >
                        Contract details
                    </PageHeading>
                    <UswdsForm
                        className={styles.formContainer}
                        id="ContractDetailsForm"
                        aria-label="Contract Details Form"
                        onSubmit={(e) => {
                            console.log('SUBMITTING')
                            e.preventDefault()
                            validateForm()
                                .then(() => {
                                    setShouldValidate(true)
                                    console.log('setted Should vallifdat')
                                })
                                .catch(() =>
                                    console.warn('Log: Validation Error')
                                )
                            if (!isValidating) handleSubmit()
                        }}
                    >
                        <fieldset className="usa-fieldset">
                            <legend className="srOnly">Contract Details</legend>
                            {showFormAlert && (
                                <Alert type="error">Something went wrong</Alert>
                            )}
                            <span>All fields are required</span>
                            <FormGroup
                                error={showFieldErrors(errors.contractType)}
                            >
                                <Fieldset
                                    className={styles.radioGroup}
                                    legend="Contract action type"
                                >
                                    {showFieldErrors(errors.contractType) && (
                                        <ErrorMessage>
                                            {errors.contractType}
                                        </ErrorMessage>
                                    )}
                                    <FieldRadio
                                        id="baseContract"
                                        name="contractType"
                                        label="Base contract"
                                        value={ContractType.Base}
                                        checked={
                                            values.contractType ===
                                            ContractType.Base
                                        }
                                        aria-required
                                    />
                                    <FieldRadio
                                        id="amendmentContract"
                                        name="contractType"
                                        label="Amendment to base contract"
                                        value={ContractType.Amendment}
                                        checked={
                                            values.contractType ===
                                            ContractType.Amendment
                                        }
                                        aria-required
                                    />
                                </Fieldset>
                            </FormGroup>

                            {!isContractTypeEmpty(values) && (
                                <>
                                    <FormGroup
                                        error={
                                            showFieldErrors(
                                                errors.contractDateStart
                                            ) ||
                                            showFieldErrors(
                                                errors.contractDateEnd
                                            )
                                        }
                                    >
                                        <Fieldset
                                            legend={
                                                isContractAmendmentSelected(
                                                    values
                                                )
                                                    ? 'Amendment effective dates'
                                                    : 'Contract effective dates'
                                            }
                                        >
                                            {showFieldErrors(
                                                errors.contractDateStart ||
                                                    errors.contractDateEnd
                                            ) && (
                                                <ErrorMessage>
                                                    {errors.contractDateStart &&
                                                    errors.contractDateEnd
                                                        ? 'You must provide a start and an end date'
                                                        : errors.contractDateStart ||
                                                          errors.contractDateEnd}
                                                </ErrorMessage>
                                            )}
                                            <DateRangePicker
                                                className={
                                                    styles.dateRangePicker
                                                }
                                                startDateHint="mm/dd/yyyy"
                                                startDateLabel="Start date"
                                                startDatePickerProps={{
                                                    disabled: false,
                                                    id: 'contractDateStart',
                                                    name: 'contractDateStart',
                                                    defaultValue:
                                                        values.contractDateStart,
                                                    onChange: (val) => {
                                                        const formattedDate = dayjs(
                                                            val
                                                        ).format('YYYY-MM-DD')
                                                        setFieldValue(
                                                            'contractDateStart',
                                                            formattedDate
                                                        )
                                                    },
                                                }}
                                                endDateHint="mm/dd/yyyy"
                                                endDateLabel="End date"
                                                endDatePickerProps={{
                                                    disabled: false,
                                                    id: 'contractDateEnd',
                                                    name: 'contractDateEnd',
                                                    defaultValue:
                                                        values.contractDateEnd,
                                                    onChange: (val) => {
                                                        const formattedDate = dayjs(
                                                            val
                                                        ).format('YYYY-MM-DD')
                                                        setFieldValue(
                                                            'contractDateEnd',
                                                            formattedDate
                                                        )
                                                    },
                                                }}
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                    <FormGroup
                                        error={showFieldErrors(
                                            errors.managedCareEntities
                                        )}
                                    >
                                        <Fieldset legend="Managed Care entities">
                                            <Link
                                                variant="external"
                                                href={
                                                    'https://www.medicaid.gov/medicaid/managed-care/managed-care-entities/index.html'
                                                }
                                                target="_blank"
                                            >
                                                Managed Care entity definitions
                                            </Link>
                                            <div className="usa-hint">
                                                <span>
                                                    Check all that apply
                                                </span>
                                            </div>
                                            {showFieldErrors(
                                                errors.managedCareEntities
                                            ) && (
                                                <ErrorMessage>
                                                    {errors.managedCareEntities}
                                                </ErrorMessage>
                                            )}
                                            <FieldCheckbox
                                                id="managedCareOrganization"
                                                name="managedCareEntities"
                                                label="Managed Care Organization (MCO)"
                                                value="MCO"
                                                checked={values.managedCareEntities.includes(
                                                    'MCO'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="prepaidInpatientHealthPlan"
                                                name="managedCareEntities"
                                                label="Prepaid Inpatient Health Plan (PIHP)"
                                                value="PIHP"
                                                checked={values.managedCareEntities.includes(
                                                    'PIHP'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="prepaidAmbulatoryHealthPlans"
                                                name="managedCareEntities"
                                                label="Prepaid Ambulatory Health Plans (PAHP)"
                                                value="PAHP"
                                                checked={values.managedCareEntities.includes(
                                                    'PAHP'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="primaryCareCaseManagementEntity"
                                                name="managedCareEntities"
                                                label="Primary Care Case Management Entity (PCCM Entity)"
                                                value="PCCM"
                                                checked={values.managedCareEntities.includes(
                                                    'PCCM'
                                                )}
                                            />
                                        </Fieldset>
                                    </FormGroup>

                                    {isContractAmendmentSelected(values) && (
                                        <>
                                            <FormGroup
                                                error={showFieldErrors(
                                                    errors.itemsAmended
                                                )}
                                            >
                                                <Fieldset legend="Items being amended">
                                                    <Link
                                                        asCustom={
                                                            ReactRouterLink
                                                        }
                                                        to={{
                                                            pathname: '/help',
                                                            hash:
                                                                '#items-being-amended-definitions',
                                                        }}
                                                    >
                                                        Items being amended
                                                        definitions
                                                    </Link>
                                                    <div className="usa-hint">
                                                        <span>
                                                            Check all that apply
                                                        </span>
                                                    </div>
                                                    {showFieldErrors(
                                                        errors.itemsAmended
                                                    ) && (
                                                        <ErrorMessage>
                                                            {
                                                                errors.itemsAmended
                                                            }
                                                        </ErrorMessage>
                                                    )}
                                                    <FieldCheckbox
                                                        id="benefitsProvided"
                                                        name="itemsAmended"
                                                        label="Benefits provided"
                                                        value="BENEFITS_PROVIDED"
                                                        checked={values.itemsAmended.includes(
                                                            'BENEFITS_PROVIDED'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="capitationRates"
                                                        name="itemsAmended"
                                                        label="Capitation rates"
                                                        value="CAPITATION_RATES"
                                                        checked={values.itemsAmended.includes(
                                                            'CAPITATION_RATES'
                                                        )}
                                                    />
                                                    {values.itemsAmended.includes(
                                                        'CAPITATION_RATES'
                                                    ) && (
                                                        <div>
                                                            <FormGroup
                                                                className={
                                                                    showFieldErrors(
                                                                        errors.capitationRates
                                                                    )
                                                                        ? styles.nestedOptionsError
                                                                        : styles.nestedOptions
                                                                }
                                                            >
                                                                <Fieldset legend="Select reason for capitation rate change">
                                                                    {showFieldErrors(
                                                                        errors.capitationRates
                                                                    ) && (
                                                                        <ErrorMessage>
                                                                            {
                                                                                errors.capitationRates
                                                                            }
                                                                        </ErrorMessage>
                                                                    )}
                                                                    <FieldRadio
                                                                        id="annualRateUpdate"
                                                                        name="capitationRates"
                                                                        label="Annual rate update"
                                                                        value="ANNUAL_RATE_UPDATE"
                                                                        checked={
                                                                            values.capitationRates ===
                                                                            CapitationRatesAmendmentReason.Annual
                                                                        }
                                                                    />
                                                                    <FieldRadio
                                                                        id="midYearUpdate"
                                                                        name="capitationRates"
                                                                        label="Mid-year update"
                                                                        value="MID_YEAR_UPDATE"
                                                                        checked={
                                                                            values.capitationRates ===
                                                                            CapitationRatesAmendmentReason.Midyear
                                                                        }
                                                                    />
                                                                    <FieldRadio
                                                                        id="other"
                                                                        name="capitationRates"
                                                                        label="Other (please describe)"
                                                                        value="OTHER"
                                                                        checked={
                                                                            values.capitationRates ===
                                                                            CapitationRatesAmendmentReason.Other
                                                                        }
                                                                    />
                                                                    {values.capitationRates ===
                                                                        CapitationRatesAmendmentReason.Other && (
                                                                        <FieldTextInput
                                                                            id="other-rates"
                                                                            label="Other capitation rate description"
                                                                            showError={showFieldErrors(
                                                                                errors.capitationRatesOther
                                                                            )}
                                                                            name="capitationRatesOther"
                                                                            type="text"
                                                                        />
                                                                    )}
                                                                </Fieldset>
                                                            </FormGroup>
                                                        </div>
                                                    )}
                                                    <FieldCheckbox
                                                        id="encounterData"
                                                        name="itemsAmended"
                                                        label="Encounter data"
                                                        value="ENCOUNTER_DATA"
                                                        checked={values.itemsAmended.includes(
                                                            'ENCOUNTER_DATA'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="enrolleeAccess"
                                                        name="itemsAmended"
                                                        label="Enrollee access"
                                                        value="ENROLLE_ACCESS"
                                                        checked={values.itemsAmended.includes(
                                                            'ENROLLE_ACCESS'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="enrollmentDisenrollementProcess"
                                                        name="itemsAmended"
                                                        label="Enrollment/disenrollment process"
                                                        value="ENROLLMENT_PROCESS"
                                                        checked={values.itemsAmended.includes(
                                                            'ENROLLMENT_PROCESS'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="financialIncentives"
                                                        name="itemsAmended"
                                                        label="Financial incentives"
                                                        value="FINANCIAL_INCENTIVES"
                                                        checked={values.itemsAmended.includes(
                                                            'FINANCIAL_INCENTIVES'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="geographicAreaServed"
                                                        name="itemsAmended"
                                                        label="Geographic area served"
                                                        value="GEO_AREA_SERVED"
                                                        checked={values.itemsAmended.includes(
                                                            'GEO_AREA_SERVED'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="grievancesAndAppealsSystem"
                                                        name="itemsAmended"
                                                        label="Grievances and appeals system"
                                                        value="GRIEVANCES_AND_APPEALS_SYSTEM"
                                                        checked={values.itemsAmended.includes(
                                                            'GRIEVANCES_AND_APPEALS_SYSTEM'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="lengthOfContractPeriod"
                                                        name="itemsAmended"
                                                        label="Length of contract period"
                                                        value="LENGTH_OF_CONTRACT_PERIOD"
                                                        checked={values.itemsAmended.includes(
                                                            'LENGTH_OF_CONTRACT_PERIOD'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="nonriskPayment"
                                                        name="itemsAmended"
                                                        label="Non-risk payment"
                                                        value="NON_RISK_PAYMENT"
                                                        checked={values.itemsAmended.includes(
                                                            'NON_RISK_PAYMENT'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="programIntegrity"
                                                        name="itemsAmended"
                                                        label="Program integrity"
                                                        value="PROGRAM_INTEGRITY"
                                                        checked={values.itemsAmended.includes(
                                                            'PROGRAM_INTEGRITY'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="qualityStandards"
                                                        name="itemsAmended"
                                                        label="Quality standards"
                                                        value="QUALITY_STANDARDS"
                                                        checked={values.itemsAmended.includes(
                                                            'QUALITY_STANDARDS'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="riskSharingMechanisms"
                                                        name="itemsAmended"
                                                        label="Risk sharing mechanisms"
                                                        value="RISK_SHARING_MECHANISM"
                                                        checked={values.itemsAmended.includes(
                                                            'RISK_SHARING_MECHANISM'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="other"
                                                        name="itemsAmended"
                                                        label="Other (please describe)"
                                                        value="OTHER"
                                                        checked={values.itemsAmended.includes(
                                                            'OTHER'
                                                        )}
                                                    />
                                                    {values.itemsAmended.includes(
                                                        'OTHER'
                                                    ) && (
                                                        <div
                                                            className={
                                                                styles.nestedOptions
                                                            }
                                                        >
                                                            <FieldTextInput
                                                                id="other-items-amended"
                                                                label="Other item description"
                                                                showError={showFieldErrors(
                                                                    errors.itemsAmendedOther
                                                                )}
                                                                name="itemsAmendedOther"
                                                                type="text"
                                                            />
                                                        </div>
                                                    )}
                                                </Fieldset>
                                            </FormGroup>
                                            {values.contractType ===
                                                ContractType.Amendment && (
                                                <>
                                                    <FormGroup
                                                        error={showFieldErrors(
                                                            errors.relatedToCovid19
                                                        )}
                                                    >
                                                        <Fieldset legend="Is this contract action related to the COVID-19 public health emergency?">
                                                            {showFieldErrors(
                                                                errors.relatedToCovid19
                                                            ) && (
                                                                <ErrorMessage>
                                                                    {
                                                                        errors.relatedToCovid19
                                                                    }
                                                                </ErrorMessage>
                                                            )}
                                                            <FieldRadio
                                                                id="covidYes"
                                                                name="relatedToCovid19"
                                                                label="Yes"
                                                                value="YES"
                                                            />
                                                            <FieldRadio
                                                                id="covidNo"
                                                                name="relatedToCovid19"
                                                                label="No"
                                                                value="NO"
                                                            />
                                                        </Fieldset>
                                                    </FormGroup>
                                                    {values.relatedToCovid19 ===
                                                        'YES' && (
                                                        <FormGroup
                                                            error={showFieldErrors(
                                                                errors.relatedToVaccination
                                                            )}
                                                        >
                                                            <Fieldset legend="Is this related to coverage and reimbursement for vaccine administration?">
                                                                {showFieldErrors(
                                                                    errors.relatedToVaccination
                                                                ) && (
                                                                    <ErrorMessage>
                                                                        {
                                                                            errors.relatedToVaccination
                                                                        }
                                                                    </ErrorMessage>
                                                                )}
                                                                <FieldRadio
                                                                    id="vaccineYes"
                                                                    name="relatedToVaccination"
                                                                    label="Yes"
                                                                    value="YES"
                                                                />
                                                                <FieldRadio
                                                                    id="vaccineNo"
                                                                    name="relatedToVaccination"
                                                                    label="No"
                                                                    value="NO"
                                                                />
                                                            </Fieldset>
                                                        </FormGroup>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}

                                    <FormGroup
                                        error={showFieldErrors(
                                            errors.federalAuthorities
                                        )}
                                    >
                                        <Fieldset legend="Federal authority your program operates under">
                                            <Link
                                                variant="external"
                                                href={
                                                    'https://www.medicaid.gov/medicaid/managed-care/managed-care-authorities/index.html'
                                                }
                                                target="_blank"
                                            >
                                                Manged Care authority
                                                definitions
                                            </Link>
                                            <div className="usa-hint">
                                                <span>
                                                    Check all that apply
                                                </span>
                                            </div>
                                            {showFieldErrors(
                                                errors.federalAuthorities
                                            ) && (
                                                <ErrorMessage>
                                                    {errors.federalAuthorities}
                                                </ErrorMessage>
                                            )}
                                            <FieldCheckbox
                                                id="1932aStatePlanAuthority"
                                                name="federalAuthorities"
                                                label="1932(a) State Plan Authority"
                                                value={
                                                    FederalAuthority.StatePlan
                                                }
                                                checked={values.federalAuthorities.includes(
                                                    FederalAuthority.StatePlan
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1915bWaiverAuthority"
                                                name="federalAuthorities"
                                                label="1915(b) Waiver Authority"
                                                value={
                                                    FederalAuthority.Waiver_1915B
                                                }
                                                checked={values.federalAuthorities.includes(
                                                    FederalAuthority.Waiver_1915B
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1115WaiverAuthority"
                                                name="federalAuthorities"
                                                label="1115 Waiver Authority"
                                                value={
                                                    FederalAuthority.Waiver_1115
                                                }
                                                checked={values.federalAuthorities.includes(
                                                    FederalAuthority.Waiver_1115
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1915aVoluntaryAuthority"
                                                name="federalAuthorities"
                                                label="1915(a) Voluntary Authority"
                                                value={
                                                    FederalAuthority.Voluntary
                                                }
                                                checked={values.federalAuthorities.includes(
                                                    FederalAuthority.Voluntary
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1937BenchmarkAuthority"
                                                name="federalAuthorities"
                                                label="1937 Benchmark Authority"
                                                value={
                                                    FederalAuthority.Benchmark
                                                }
                                                checked={values.federalAuthorities.includes(
                                                    FederalAuthority.Benchmark
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="titleXXISeparateChipStatePlanAuthority"
                                                name="federalAuthorities"
                                                label="Title XXI Separate CHIP State Plan Authority"
                                                value={
                                                    FederalAuthority.TitleXxi
                                                }
                                                checked={values.federalAuthorities.includes(
                                                    FederalAuthority.TitleXxi
                                                )}
                                            />
                                        </Fieldset>
                                    </FormGroup>
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
                            <Button type="submit" disabled={isSubmitting}>
                                Continue
                            </Button>
                        </ButtonGroup>
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

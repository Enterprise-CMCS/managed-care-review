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
    useUpdateDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import styles from '../StateSubmissionForm.module.scss'
import { ManagedCareEntity } from '../../../common-code/domain-models/DraftSubmissionType'
import { updatesFromSubmission } from '../updateSubmissionTransform'
import {
    ManagedCareEntityRecord,
    FederalAuthorityRecord,
} from '../../../constants/submissions'

/*  
 Date validations
 Dates are formatted from user input MM/DD/YYY to YYYY-MM-DD form data. This matches the graphql Date scalar.
 Use custom Yup verifyFormat method to validate formatting https://github.com/jquense/yup#yupaddmethodschematype-schema-name-string-method--schema-void
 If date is not correct, handle as Invalid Date
*/

const formatDate = (initialValue?: string): string | undefined => {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjs(initialValue).format('YYYY-MM-DD')
        : initialValue // undefined
}

Yup.addMethod(Yup.date, 'verifyFormat', function (formats, parseStrict) {
    return this.transform(function (value, originalValue) {
        if (this.isType(value)) return value
        value = dayjs(originalValue, formats, parseStrict)
        return value.isValid() ? value.toDate() : new Date('') // Invalid Date
    })
})

const ContractDetailsFormSchema = Yup.object().shape({
    contractType: Yup.string().defined(
        'You must choose a contract action type'
    ),
    contractDateStart: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .verifyFormat('YYYY-MM-DD', true)
        .defined('You must enter a start date')
        .typeError('The start date must be in MM/DD/YYYY format'),
    contractDateEnd: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .verifyFormat('YYYY-MM-DD', true)
        .defined('You must enter an end date')
        .typeError('The end date must be in MM/DD/YYYY format')
        .min(
            Yup.ref('contractDateStart'),
            'The end date must come after the start date'
        ),
    managedCareEntities: Yup.array().min(
        1,
        'You must select at least one entity'
    ),
    federalAuthorities: Yup.array().min(
        1,
        'You must select at least one authority'
    ),
})
export interface ContractDetailsFormValues {
    contractType: ContractType | undefined
    contractDateStart: string
    contractDateEnd: string
    managedCareEntities: ManagedCareEntity[]
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

    const isDateEmptyOrInvalid = (dateValue: string): boolean => !dateValue

    const ContractDatesErrorMessage = ({
        values,
        validationErrorMessage,
    }: {
        values: ContractDetailsFormValues
        validationErrorMessage: string
    }): React.ReactElement => (
        <ErrorMessage>
            {isDateEmptyOrInvalid(values.contractDateEnd) &&
            isDateEmptyOrInvalid(values.contractDateStart)
                ? 'You must provide a start and an end date'
                : validationErrorMessage}
        </ErrorMessage>
    )
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

        try {
            await updateDraftSubmission({
                variables: {
                    input: {
                        submissionID: draftSubmission.id,
                        draftSubmissionUpdates: updatedDraft,
                    },
                },
            })

            history.push(`/submissions/${draftSubmission.id}/rate-details`)
        } catch (serverError) {
            setShowFormAlert(true)
            formikHelpers.setSubmitting(false)
        }
    }

    return (
        <Formik
            initialValues={ContractDetailsInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={ContractDetailsFormSchema}
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
                            e.preventDefault()
                            validateForm()
                                .then(() => {
                                    setShouldValidate(true)
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
                                                <ContractDatesErrorMessage
                                                    values={values}
                                                    validationErrorMessage={
                                                        errors.contractDateStart ||
                                                        errors.contractDateEnd ||
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
                                                    id: 'contractDateStart',
                                                    name: 'contractDateStart',
                                                    defaultValue:
                                                        values.contractDateStart,
                                                    onChange: (val) =>
                                                        setFieldValue(
                                                            'contractDateStart',
                                                            formatDate(val)
                                                        ),
                                                }}
                                                endDateHint="mm/dd/yyyy"
                                                endDateLabel="End date"
                                                endDatePickerProps={{
                                                    disabled: false,
                                                    id: 'contractDateEnd',
                                                    name: 'contractDateEnd',
                                                    defaultValue:
                                                        values.contractDateEnd,
                                                    onChange: (val) =>
                                                        setFieldValue(
                                                            'contractDateEnd',
                                                            formatDate(val)
                                                        ),
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
                                                label={
                                                    ManagedCareEntityRecord.MCO
                                                }
                                                value="MCO"
                                                checked={values.managedCareEntities.includes(
                                                    'MCO'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="prepaidInpatientHealthPlan"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.PIHP
                                                }
                                                value="PIHP"
                                                checked={values.managedCareEntities.includes(
                                                    'PIHP'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="prepaidAmbulatoryHealthPlans"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.PAHP
                                                }
                                                value="PAHP"
                                                checked={values.managedCareEntities.includes(
                                                    'PAHP'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="primaryCareCaseManagementEntity"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.PCCM
                                                }
                                                value="PCCM"
                                                checked={values.managedCareEntities.includes(
                                                    'PCCM'
                                                )}
                                            />
                                        </Fieldset>
                                    </FormGroup>

                                    {isContractAmendmentSelected(values) && (
                                        <>
                                            <FormGroup>
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
                                                    <FieldCheckbox
                                                        id="benefitsProvided"
                                                        name="itemsAmended"
                                                        label="Benefits provided"
                                                        value="benefits-provided"
                                                    />
                                                    <FieldCheckbox
                                                        id="capitationRates"
                                                        name="itemsAmended"
                                                        label="Capitation rates"
                                                        value="capitation-rates"
                                                    />
                                                    <div
                                                        className={
                                                            styles.nestedOptions
                                                        }
                                                    >
                                                        <Fieldset legend="Select reason for capitation rate change">
                                                            <FieldRadio
                                                                id="annualRateUpdate"
                                                                name="capitationRates"
                                                                label="Annual rate update"
                                                                value="annual-rate-update"
                                                            />
                                                            <FieldRadio
                                                                id="midYearUpdate"
                                                                name="capitationRates"
                                                                label="Mid-year update"
                                                                value="mid-year-update"
                                                            />
                                                            <FieldRadio
                                                                id="other"
                                                                name="capitationRates"
                                                                label="Other (please describe)"
                                                                value="other"
                                                            />
                                                            <FieldTextInput
                                                                id="other-rates"
                                                                label="Other capitation rate description"
                                                                showError={
                                                                    false
                                                                }
                                                                name="otherRates"
                                                                type="text"
                                                            />
                                                        </Fieldset>
                                                    </div>
                                                    <FieldCheckbox
                                                        id="encounterData"
                                                        name="itemsAmended"
                                                        label="Encounter data"
                                                        value="encounter-data"
                                                    />
                                                    <FieldCheckbox
                                                        id="enrolleeAccess"
                                                        name="itemsAmended"
                                                        label="Enrollee access"
                                                        value="enrollee-access"
                                                    />
                                                    <FieldCheckbox
                                                        id="enrollmentDisenrollementProcess"
                                                        name="itemsAmended"
                                                        label="Enrollment/disenrollment process"
                                                        value="enrollment-disenrollment-process"
                                                    />
                                                    <FieldCheckbox
                                                        id="financialIncentives"
                                                        name="itemsAmended"
                                                        label="Financial incentives"
                                                        value="financial-incentives"
                                                    />
                                                    <FieldCheckbox
                                                        id="geographicAreaServed"
                                                        name="itemsAmended"
                                                        label="Geographic area served"
                                                        value="geographic-area-served"
                                                    />
                                                    <FieldCheckbox
                                                        id="grievancesAndAppealsSystem"
                                                        name="itemsAmended"
                                                        label="Grievances and appeals system"
                                                        value="grievances-appeals-system"
                                                    />
                                                    <FieldCheckbox
                                                        id="lengthOfContractPeriod"
                                                        name="itemsAmended"
                                                        label="Length of contract period"
                                                        value="length-of-contract-period"
                                                    />
                                                    <FieldCheckbox
                                                        id="nonriskPayment"
                                                        name="itemsAmended"
                                                        label="Non-risk payment"
                                                        value="nonrisk-payment"
                                                    />
                                                    <FieldCheckbox
                                                        id="programIntegrity"
                                                        name="itemsAmended"
                                                        label="Program integrity"
                                                        value="program-integrity"
                                                    />
                                                    <FieldCheckbox
                                                        id="qualityStandards"
                                                        name="itemsAmended"
                                                        label="Quality standards"
                                                        value="quality-standards"
                                                    />
                                                    <FieldCheckbox
                                                        id="riskSharingMechanisms"
                                                        name="itemsAmended"
                                                        label="Risk sharing mechanisms"
                                                        value="risk-sharing-mechanisms"
                                                    />
                                                    <FieldCheckbox
                                                        id="other"
                                                        name="itemsAmended"
                                                        label="Other (please describe)"
                                                        value="other"
                                                    />
                                                    <div
                                                        className={
                                                            styles.nestedOptions
                                                        }
                                                    >
                                                        <FieldTextInput
                                                            id="other-items-amended"
                                                            label="Other item description"
                                                            showError={false}
                                                            name="otherItem"
                                                            type="text"
                                                        />
                                                    </div>
                                                </Fieldset>
                                            </FormGroup>
                                            <FormGroup>
                                                <Fieldset legend="Is this contract action related to the COVID-19 public health emergency?">
                                                    <FieldRadio
                                                        id="covidYes"
                                                        name="covidRelated"
                                                        label="Yes"
                                                        value="covid-yes"
                                                    />
                                                    <FieldRadio
                                                        id="covidNo"
                                                        name="covidRelated"
                                                        label="No"
                                                        value="covid-no"
                                                    />
                                                </Fieldset>
                                            </FormGroup>
                                            <FormGroup>
                                                <Fieldset legend="Is this related to coverage and reimbursement for vaccine administration?">
                                                    <FieldRadio
                                                        id="vaccineYes"
                                                        name="vaccineReimbursement"
                                                        label="Yes"
                                                        value="vaccine-reimbursement-yes"
                                                    />
                                                    <FieldRadio
                                                        id="vaccineNo"
                                                        name="vaccineReimbursement"
                                                        label="No"
                                                        value="vaccine-reimbursement-no"
                                                    />
                                                </Fieldset>
                                            </FormGroup>
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
                                                Managed Care authority
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
                                                label={
                                                    FederalAuthorityRecord.STATE_PLAN
                                                }
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
                                                label={
                                                    FederalAuthorityRecord.WAIVER_1915B
                                                }
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
                                                label={
                                                    FederalAuthorityRecord.WAIVER_1115
                                                }
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
                                                label={
                                                    FederalAuthorityRecord.VOLUNTARY
                                                }
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
                                                label={
                                                    FederalAuthorityRecord.BENCHMARK
                                                }
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
                                                label={
                                                    FederalAuthorityRecord.TITLE_XXI
                                                }
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
                            <Button
                                type="submit"
                                onClick={() => setShouldValidate(true)}
                                disabled={isSubmitting}
                            >
                                Continue
                            </Button>
                        </ButtonGroup>
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

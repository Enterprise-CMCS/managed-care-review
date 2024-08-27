import {
    Form as UswdsForm,
    Fieldset,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers } from 'formik'
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    DynamicStepIndicator,
    ErrorSummary,
    FieldRadio,
    FieldTextarea,
    FieldYesNo,
    PoliteErrorMessage,
    ReactRouterLinkWithLogging,
} from '../../../components'
import { isContractWithProvisions } from '../../../common-code/ContractType'
import {
    PopulationCoveredRecord,
    SubmissionTypeRecord,
} from '../../../constants/healthPlanPackages'
import {
    ContractType,
    PopulationCoveredType,
} from '../../../common-code/healthPlanFormDataType'
import {
    SubmissionType as SubmissionTypeT,
    CreateContractInput,
    ContractDraftRevisionFormDataInput,
    UpdateContractDraftRevisionInput,
} from '../../../gen/gqlClient'
import { PageActions } from '../PageActions'
import styles from '../StateSubmissionForm.module.scss'
import { GenericApiErrorBanner, ProgramSelect } from '../../../components'
import {
    activeFormPages,
    type ContractFormPageProps,
} from '../StateSubmissionForm'
import {
    booleanAsYesNoFormValue,
    yesNoFormValueAsBoolean,
} from '../../../components/Form/FieldYesNo/FieldYesNo'
import { SubmissionTypeFormSchema } from './SubmissionTypeSchema'
import { RoutesRecord, STATE_SUBMISSION_FORM_ROUTES } from '../../../constants'
import { FormContainer } from '../FormContainer'
import { useCurrentRoute } from '../../../hooks'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouteParams } from '../../../hooks/useRouteParams'
import { PageBannerAlerts } from '../PageBannerAlerts'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import { useContractForm } from '../../../hooks/useContractForm'

export interface SubmissionTypeFormValues {
    populationCovered?: PopulationCoveredType
    programIDs: string[]
    riskBasedContract: string
    submissionDescription: string
    submissionType: string
    contractType: string
}

type FormError =
    FormikErrors<SubmissionTypeFormValues>[keyof FormikErrors<SubmissionTypeFormValues>]

export const SubmissionType = ({
    showValidations = false,
}: ContractFormPageProps): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [showAPIErrorBanner, setShowAPIErrorBanner] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic message when true

    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()
    const navigate = useNavigate()
    const location = useLocation()
    const isNewSubmission = location.pathname === '/submissions/new'
    const { id } = useRouteParams()

    const {
        draftSubmission,
        updateDraft,
        createDraft,
        interimState,
        showPageErrorMessage,
    } = useContractForm(id)

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const submissionTypeInitialValues: SubmissionTypeFormValues = {
        populationCovered:
            draftSubmission?.draftRevision?.formData.populationCovered === null
                ? undefined
                : draftSubmission?.draftRevision?.formData.populationCovered,
        programIDs: draftSubmission?.draftRevision?.formData.programIDs ?? [],
        riskBasedContract:
            booleanAsYesNoFormValue(
                draftSubmission?.draftRevision?.formData.riskBasedContract
            ) ?? '',
        submissionDescription:
            draftSubmission?.draftRevision?.formData.submissionDescription ??
            '',
        submissionType:
            draftSubmission?.draftRevision?.formData.submissionType ?? '',
        contractType:
            draftSubmission?.draftRevision?.formData.contractType ?? '',
    }

    if (interimState) {
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />
    }

    const handleFormSubmit = async (
        values: SubmissionTypeFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        redirectPath?: string
    ) => {
        if (isNewSubmission) {
            if (!values.populationCovered) {
                console.info(
                    'unexpected error, attempting to submit without population covered',
                    values.submissionType
                )
                return
            }
            if (
                !(
                    values.submissionType === 'CONTRACT_ONLY' ||
                    values.submissionType === 'CONTRACT_AND_RATES'
                )
            ) {
                console.info(
                    'unexpected error, attempting to submit a submissionType of ',
                    values.submissionType
                )
                return
            }
            if (
                !(
                    values.contractType === 'BASE' ||
                    values.contractType === 'AMENDMENT'
                )
            ) {
                console.info(
                    'unexpected error, attempting to submit a contractType of ',
                    values.contractType
                )
                return
            }

            const input: CreateContractInput = {
                populationCovered: values.populationCovered!,
                programIDs: values.programIDs,
                submissionType: values.submissionType as SubmissionTypeT,
                riskBasedContract: yesNoFormValueAsBoolean(
                    values.riskBasedContract
                ),
                submissionDescription: values.submissionDescription,
                contractType: values.contractType as ContractType,
            }

            if (!createDraft) {
                console.info(
                    'PROGRAMMING ERROR, SubmissionType for does have props needed to update a draft.'
                )
                return
            }

            const draftSubmission = await createDraft(input)

            if (draftSubmission instanceof Error) {
                setShowAPIErrorBanner(true)
                setSubmitting(false) // unblock submit button to allow resubmit
                console.info(
                    'Log: creating new submission failed with server error',
                    draftSubmission
                )
                return
            }
            navigate(`/submissions/${draftSubmission.id}/edit/contract-details`)
        } else {
            if (draftSubmission === undefined || !updateDraft) {
                console.info(draftSubmission, updateDraft)
                console.info(
                    'ERROR, SubmissionType for does not have props needed to update a draft.'
                )
                return
            }
            // set new values
            const updatedDraftSubmissionFormData: ContractDraftRevisionFormDataInput =
                {
                    contractExecutionStatus:
                        draftSubmission.draftRevision.formData
                            .contractExecutionStatus,
                    contractDateStart:
                        draftSubmission.draftRevision.formData
                            .contractDateStart,
                    contractDateEnd:
                        draftSubmission.draftRevision.formData.contractDateEnd,
                    contractType: values.contractType as ContractType,
                    submissionDescription: values.submissionDescription,
                    riskBasedContract: yesNoFormValueAsBoolean(
                        values.riskBasedContract
                    ),
                    populationCovered: values.populationCovered,
                    submissionType: values.submissionType as SubmissionTypeT,
                    programIDs: values.programIDs,
                    stateContacts:
                        draftSubmission.draftRevision.formData.stateContacts ||
                        [],
                    supportingDocuments:
                        draftSubmission.draftRevision.formData
                            .supportingDocuments || [],
                    managedCareEntities:
                        draftSubmission.draftRevision.formData
                            .managedCareEntities,
                    federalAuthorities:
                        draftSubmission.draftRevision.formData
                            .federalAuthorities,
                    contractDocuments:
                        draftSubmission.draftRevision.formData
                            .contractDocuments,
                    statutoryRegulatoryAttestation:
                        draftSubmission.draftRevision.formData
                            .statutoryRegulatoryAttestation,
                    // If contract is in compliance, we set the description to undefined. This clears out previous non-compliance description
                    statutoryRegulatoryAttestationDescription:
                        draftSubmission.draftRevision.formData
                            .statutoryRegulatoryAttestationDescription,
                }

            if (isContractWithProvisions(draftSubmission)) {
                updatedDraftSubmissionFormData.inLieuServicesAndSettings =
                    draftSubmission.draftRevision.formData.inLieuServicesAndSettings
                updatedDraftSubmissionFormData.modifiedBenefitsProvided =
                    draftSubmission.draftRevision.formData.modifiedBenefitsProvided
                updatedDraftSubmissionFormData.modifiedGeoAreaServed =
                    draftSubmission.draftRevision.formData.modifiedGeoAreaServed
                updatedDraftSubmissionFormData.modifiedMedicaidBeneficiaries =
                    draftSubmission.draftRevision.formData.modifiedMedicaidBeneficiaries
                updatedDraftSubmissionFormData.modifiedRiskSharingStrategy =
                    draftSubmission.draftRevision.formData.modifiedRiskSharingStrategy
                updatedDraftSubmissionFormData.modifiedIncentiveArrangements =
                    draftSubmission.draftRevision.formData.modifiedIncentiveArrangements
                updatedDraftSubmissionFormData.modifiedWitholdAgreements =
                    draftSubmission.draftRevision.formData.modifiedWitholdAgreements
                updatedDraftSubmissionFormData.modifiedStateDirectedPayments =
                    draftSubmission.draftRevision.formData.modifiedStateDirectedPayments
                updatedDraftSubmissionFormData.modifiedPassThroughPayments =
                    draftSubmission.draftRevision.formData.modifiedPassThroughPayments
                updatedDraftSubmissionFormData.modifiedPaymentsForMentalDiseaseInstitutions =
                    draftSubmission.draftRevision.formData.modifiedPaymentsForMentalDiseaseInstitutions
                updatedDraftSubmissionFormData.modifiedMedicalLossRatioStandards =
                    draftSubmission.draftRevision.formData.modifiedMedicalLossRatioStandards
                updatedDraftSubmissionFormData.modifiedOtherFinancialPaymentIncentive =
                    draftSubmission.draftRevision.formData.modifiedOtherFinancialPaymentIncentive
                updatedDraftSubmissionFormData.modifiedEnrollmentProcess =
                    draftSubmission.draftRevision.formData.modifiedEnrollmentProcess
                updatedDraftSubmissionFormData.modifiedGrevienceAndAppeal =
                    draftSubmission.draftRevision.formData.modifiedGrevienceAndAppeal
                updatedDraftSubmissionFormData.modifiedNetworkAdequacyStandards =
                    draftSubmission.draftRevision.formData.modifiedNetworkAdequacyStandards
                updatedDraftSubmissionFormData.modifiedLengthOfContract =
                    draftSubmission.draftRevision.formData.modifiedLengthOfContract
                updatedDraftSubmissionFormData.modifiedNonRiskPaymentArrangements =
                    draftSubmission.draftRevision.formData.modifiedNonRiskPaymentArrangements
            } else {
                updatedDraftSubmissionFormData.inLieuServicesAndSettings =
                    undefined
                updatedDraftSubmissionFormData.modifiedBenefitsProvided =
                    undefined
                updatedDraftSubmissionFormData.modifiedGeoAreaServed = undefined
                updatedDraftSubmissionFormData.modifiedMedicaidBeneficiaries =
                    undefined
                updatedDraftSubmissionFormData.modifiedRiskSharingStrategy =
                    undefined
                updatedDraftSubmissionFormData.modifiedIncentiveArrangements =
                    undefined
                updatedDraftSubmissionFormData.modifiedWitholdAgreements =
                    undefined
                updatedDraftSubmissionFormData.modifiedStateDirectedPayments =
                    undefined
                updatedDraftSubmissionFormData.modifiedPassThroughPayments =
                    undefined
                updatedDraftSubmissionFormData.modifiedPaymentsForMentalDiseaseInstitutions =
                    undefined
                updatedDraftSubmissionFormData.modifiedMedicalLossRatioStandards =
                    undefined
                updatedDraftSubmissionFormData.modifiedOtherFinancialPaymentIncentive =
                    undefined
                updatedDraftSubmissionFormData.modifiedEnrollmentProcess =
                    undefined
                updatedDraftSubmissionFormData.modifiedGrevienceAndAppeal =
                    undefined
                updatedDraftSubmissionFormData.modifiedNetworkAdequacyStandards =
                    undefined
                updatedDraftSubmissionFormData.modifiedLengthOfContract =
                    undefined
                updatedDraftSubmissionFormData.modifiedNonRiskPaymentArrangements =
                    undefined
            }

            const updatedContractInput: UpdateContractDraftRevisionInput = {
                formData: updatedDraftSubmissionFormData,
                contractID: draftSubmission.id,
                lastSeenUpdatedAt: draftSubmission.draftRevision.updatedAt,
            }

            const updatedDraft = await updateDraft(updatedContractInput)
            if (updatedDraft instanceof Error) {
                setSubmitting(false)
            } else {
                navigate(redirectPath || `../contract-details`)
            }
        }
    }

    const generateErrorSummaryErrors = (
        errors: FormikErrors<SubmissionTypeFormValues>
    ) => {
        const errorObject = {}
        const formikErrors = { ...errors }

        if (formikErrors.programIDs) {
            Object.assign(errorObject, {
                '#programIDs': formikErrors.programIDs,
            })
            delete formikErrors.programIDs
        }

        return { ...errorObject, ...formikErrors }
    }

    // Handles population covered click. CHIP-only can only have submission type of CONTRACT_ONLY. This function
    // automatically resets the submission type radio selection when CONTRACT_ONLY is not selected and switching to
    // CHIP-only population coverage.
    const handlePopulationCoveredClick = (
        value: PopulationCoveredType,
        values: SubmissionTypeFormValues,
        setFieldValue: FormikHelpers<SubmissionTypeFormValues>['setFieldValue']
    ): void => {
        const isSelectingChipOnly =
            value === 'CHIP' && values.populationCovered !== value
        if (
            isSelectingChipOnly &&
            values.submissionType === 'CONTRACT_AND_RATES'
        ) {
            void setFieldValue('submissionType', 'CONTRACT_ONLY', true)
        }
    }

    return (
        <>
            <div>
                <DynamicStepIndicator
                    formPages={
                        draftSubmission
                            ? activeFormPages(
                                  draftSubmission.draftRevision.formData
                              )
                            : STATE_SUBMISSION_FORM_ROUTES
                    }
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission?.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                />
            </div>
            <FormContainer id="SubmissionType">
                <Formik
                    initialValues={submissionTypeInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting)
                    }}
                    validationSchema={SubmissionTypeFormSchema()}
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        isSubmitting,
                        setSubmitting,
                        setFieldValue,
                    }) => {
                        return (
                            <>
                                <UswdsForm
                                    className={styles.formContainer}
                                    id="SubmissionTypeForm"
                                    aria-label={
                                        isNewSubmission
                                            ? 'New Submission Form'
                                            : 'Submission Type Form'
                                    }
                                    aria-describedby="form-guidance"
                                    onSubmit={handleSubmit}
                                >
                                    <fieldset className="usa-fieldset">
                                        <legend className="srOnly">
                                            Submission type
                                        </legend>
                                        {showAPIErrorBanner && (
                                            <GenericApiErrorBanner />
                                        )}

                                        {shouldValidate && (
                                            <ErrorSummary
                                                errors={generateErrorSummaryErrors(
                                                    errors
                                                )}
                                                headingRef={
                                                    errorSummaryHeadingRef
                                                }
                                            />
                                        )}
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.populationCovered
                                            )}
                                            className="margin-top-0"
                                        >
                                            <Fieldset
                                                className={styles.radioGroup}
                                                role="radiogroup"
                                                aria-required
                                                legend="Which populations does this contract action cover?"
                                            >
                                                <span
                                                    className={
                                                        styles.requiredOptionalText
                                                    }
                                                >
                                                    Required
                                                </span>
                                                {showFieldErrors(
                                                    errors.populationCovered
                                                ) && (
                                                    <PoliteErrorMessage formFieldLabel="Which populations does this contract action cover?">
                                                        {
                                                            errors.populationCovered
                                                        }
                                                    </PoliteErrorMessage>
                                                )}
                                                <FieldRadio
                                                    id="medicaid"
                                                    name="populationCovered"
                                                    label={
                                                        PopulationCoveredRecord[
                                                            'MEDICAID'
                                                        ]
                                                    }
                                                    value={'MEDICAID'}
                                                    onClick={() =>
                                                        handlePopulationCoveredClick(
                                                            'MEDICAID',
                                                            values,
                                                            setFieldValue
                                                        )
                                                    }
                                                    aria-required
                                                    list_position={1}
                                                    list_options={3}
                                                    parent_component_heading="Which populations does this contract action cover?"
                                                    radio_button_title={
                                                        PopulationCoveredRecord[
                                                            'MEDICAID'
                                                        ]
                                                    }
                                                />
                                                <FieldRadio
                                                    id="medicaid-and-chip"
                                                    name="populationCovered"
                                                    label={
                                                        PopulationCoveredRecord[
                                                            'MEDICAID_AND_CHIP'
                                                        ]
                                                    }
                                                    value={'MEDICAID_AND_CHIP'}
                                                    onClick={() =>
                                                        handlePopulationCoveredClick(
                                                            'MEDICAID_AND_CHIP',
                                                            values,
                                                            setFieldValue
                                                        )
                                                    }
                                                    list_position={2}
                                                    list_options={3}
                                                    parent_component_heading="Which populations does this contract action cover?"
                                                    radio_button_title={
                                                        PopulationCoveredRecord[
                                                            'MEDICAID_AND_CHIP'
                                                        ]
                                                    }
                                                />
                                                <FieldRadio
                                                    id="chip"
                                                    name="populationCovered"
                                                    label={
                                                        PopulationCoveredRecord[
                                                            'CHIP'
                                                        ]
                                                    }
                                                    value={'CHIP'}
                                                    onClick={() =>
                                                        handlePopulationCoveredClick(
                                                            'CHIP',
                                                            values,
                                                            setFieldValue
                                                        )
                                                    }
                                                    list_position={3}
                                                    list_options={3}
                                                    parent_component_heading="Which populations does this contract action cover?"
                                                    radio_button_title={
                                                        PopulationCoveredRecord[
                                                            'CHIP'
                                                        ]
                                                    }
                                                />
                                            </Fieldset>
                                        </FormGroup>

                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.programIDs
                                            )}
                                        >
                                            <Label htmlFor="programIDs">
                                                Programs this contract action
                                                covers
                                            </Label>
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            {showFieldErrors(
                                                errors.programIDs
                                            ) && (
                                                <PoliteErrorMessage formFieldLabel="Programs this contract action covers">
                                                    {errors.programIDs}
                                                </PoliteErrorMessage>
                                            )}
                                            <ProgramSelect
                                                name="programIDs"
                                                inputId="programIDs"
                                                programIDs={values.programIDs}
                                                contractProgramsOnly
                                                aria-label="Programs this contract action covers (required)"
                                                label="Programs this contract action covers"
                                            />
                                        </FormGroup>
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.submissionType
                                            )}
                                        >
                                            <Fieldset
                                                className={styles.radioGroup}
                                                role="radiogroup"
                                                aria-required
                                                defaultValue={
                                                    values.submissionType
                                                }
                                                legend="Choose a submission type"
                                                id="submissionType"
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
                                                    <PoliteErrorMessage formFieldLabel="Choose a submission type">
                                                        {errors.submissionType}
                                                    </PoliteErrorMessage>
                                                )}
                                                <FieldRadio
                                                    id="contractOnly"
                                                    name="submissionType"
                                                    label={
                                                        SubmissionTypeRecord[
                                                            'CONTRACT_ONLY'
                                                        ]
                                                    }
                                                    value={'CONTRACT_ONLY'}
                                                    list_position={1}
                                                    list_options={2}
                                                    parent_component_heading="Programs this contract action covers"
                                                    radio_button_title={
                                                        SubmissionTypeRecord[
                                                            'CONTRACT_ONLY'
                                                        ]
                                                    }
                                                />
                                                <FieldRadio
                                                    id="contractRate"
                                                    name="submissionType"
                                                    label={
                                                        SubmissionTypeRecord[
                                                            'CONTRACT_AND_RATES'
                                                        ]
                                                    }
                                                    value={'CONTRACT_AND_RATES'}
                                                    disabled={
                                                        values.populationCovered ===
                                                        'CHIP'
                                                    }
                                                    list_position={2}
                                                    list_options={2}
                                                    parent_component_heading="Programs this contract action covers"
                                                    radio_button_title={
                                                        SubmissionTypeRecord[
                                                            'CONTRACT_AND_RATES'
                                                        ]
                                                    }
                                                />
                                                {values.populationCovered ===
                                                    'CHIP' && (
                                                    <div
                                                        role="note"
                                                        aria-labelledby="submissionType"
                                                        className="usa-hint padding-top-2"
                                                    >
                                                        States are not required
                                                        to submit rates with
                                                        CHIP-only contracts.
                                                    </div>
                                                )}
                                            </Fieldset>
                                        </FormGroup>
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.contractType
                                            )}
                                        >
                                            <Fieldset
                                                role="radiogroup"
                                                aria-required
                                                className={styles.radioGroup}
                                                legend="Contract action type"
                                                id="contractType"
                                            >
                                                <span
                                                    className={
                                                        styles.requiredOptionalText
                                                    }
                                                >
                                                    Required
                                                </span>
                                                {showFieldErrors(
                                                    errors.contractType
                                                ) && (
                                                    <PoliteErrorMessage formFieldLabel="Contract action type">
                                                        {errors.contractType}
                                                    </PoliteErrorMessage>
                                                )}
                                                <FieldRadio
                                                    id="baseContract"
                                                    name="contractType"
                                                    label="Base contract"
                                                    aria-required
                                                    value={'BASE'}
                                                    list_position={1}
                                                    list_options={2}
                                                    parent_component_heading="Contract action type"
                                                    radio_button_title="Base contract"
                                                />
                                                <FieldRadio
                                                    id="amendmentContract"
                                                    name="contractType"
                                                    label="Amendment to base contract"
                                                    aria-required
                                                    value={'AMENDMENT'}
                                                    list_position={2}
                                                    list_options={2}
                                                    parent_component_heading="Contract action type"
                                                    radio_button_title="Amendment to base contract"
                                                />
                                            </Fieldset>
                                        </FormGroup>
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.riskBasedContract
                                            )}
                                        >
                                            <FieldYesNo
                                                id="riskBasedContract"
                                                name="riskBasedContract"
                                                label="Is this a risk-based contract?"
                                                aria-required
                                                hint="See 42 CFR § 438.2"
                                                showError={showFieldErrors(
                                                    errors.riskBasedContract
                                                )}
                                            />
                                        </FormGroup>
                                        <FieldTextarea
                                            label="Submission description"
                                            id="submissionDescription"
                                            name="submissionDescription"
                                            aria-required
                                            aria-describedby="submissionDescriptionHelp"
                                            showError={showFieldErrors(
                                                errors.submissionDescription
                                            )}
                                            hint={
                                                <>
                                                    <p
                                                        id="submissionDescriptionHelp"
                                                        role="note"
                                                    >
                                                        Provide a 1-2 paragraph
                                                        summary of your
                                                        submission that
                                                        highlights any important
                                                        changes CMS reviewers
                                                        will need to be aware of
                                                    </p>
                                                    <ReactRouterLinkWithLogging
                                                        variant="external"
                                                        to={{
                                                            pathname: '/help',
                                                            hash: '#submission-description',
                                                        }}
                                                        target="_blank"
                                                    >
                                                        View description
                                                        examples
                                                    </ReactRouterLinkWithLogging>
                                                </>
                                            }
                                        />
                                    </fieldset>
                                    <PageActions
                                        pageVariant={
                                            isNewSubmission
                                                ? 'FIRST'
                                                : 'EDIT_FIRST'
                                        }
                                        backOnClick={() =>
                                            navigate(
                                                RoutesRecord.DASHBOARD_SUBMISSIONS
                                            )
                                        }
                                        continueOnClick={() => {
                                            setShouldValidate(true)
                                            setFocusErrorSummaryHeading(true)
                                        }}
                                        saveAsDraftOnClick={async () => {
                                            await handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                RoutesRecord.DASHBOARD_SUBMISSIONS
                                            )
                                        }}
                                        actionInProgress={isSubmitting}
                                        backOnClickUrl={
                                            RoutesRecord.DASHBOARD_SUBMISSIONS
                                        }
                                        saveAsDraftOnClickUrl={
                                            RoutesRecord.DASHBOARD_SUBMISSIONS
                                        }
                                        continueOnClickUrl="/edit/contract-details"
                                    />
                                </UswdsForm>
                            </>
                        )
                    }}
                </Formik>
            </FormContainer>
        </>
    )
}

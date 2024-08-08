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
    useFetchContractQuery,
    useCreateContractMutation,
    useUpdateContractMutation,
    useUpdateDraftContractRatesMutation,
    ContractRevision
} from '../../../gen/gqlClient'
import { PageActions } from '../PageActions'
import styles from '../StateSubmissionForm.module.scss'
import { GenericApiErrorBanner, ProgramSelect } from '../../../components'
import {
    type HealthPlanFormPageProps,
    activeFormPages,
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
}: HealthPlanFormPageProps): React.ReactElement => {
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
    const [updateContract] = useUpdateDraftContractRatesMutation()
    const { id } = useRouteParams()
    const {
        draftSubmission,
        updateDraft,
        createDraft,
        interimState,
        showPageErrorMessage,
        unlockInfo,
    } = useContractForm(id)
    
    // <ErrorOrLoadingPage
    //     state={fetchContractLoading ? 'LOADING' : 'GENERIC_ERROR'}
    // />

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
                draftSubmission?.draftRevision?.formData.riskBasedContract === null
                    ? undefined
                    : draftSubmission?.draftRevision?.formData.riskBasedContract
            ) ?? '',
        submissionDescription:
            draftSubmission?.draftRevision?.formData.submissionDescription ?? '',
        submissionType: draftSubmission?.draftRevision?.formData.submissionType ?? '',
        contractType: draftSubmission?.draftRevision?.formData.contractType ?? '',
    }

    const handleFormSubmit = async (
        values: SubmissionTypeFormValues,
        formikHelpers: Pick<
            FormikHelpers<SubmissionTypeFormValues>,
            'setSubmitting'
        >,
        redirectPath?: string
    ) => {
        if (isNewSubmission) {
            try {

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
                const { data: createContractData, errors: createContractErrors } =
                    await draftSubmission({
                        variables: {
                            input,
                        },
                    })
                if (!createContractData) {
                    setShowAPIErrorBanner(true)
                    return
                }
                if (createContractErrors instanceof Error) {
                    setShowAPIErrorBanner(true)
                    return
                }
                const draftContract = createContractData.createContract.contract
        
                if (!draftContract) {
                    setShowAPIErrorBanner(true)
                    return
                }
                if (draftContract instanceof Error) {
                    setShowAPIErrorBanner(true)
                    return
                }
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

                navigate(
                    `/submissions/${draftContract.id}/edit/contract-details`
                )
            } catch (serverError) {
                setShowAPIErrorBanner(true)
                formikHelpers.setSubmitting(false) // unblock submit button to allow resubmit
                console.info(
                    'Log: creating new submission failed with server error',
                    serverError
                )
            }
        } else {
            if (!draftSubmission) {
                console.info(
                    'Expected draft revision on contract to be present'
                )
                return
            }
            // set new values
            draftContract.draftRevision.formData.populationCovered =
                values.populationCovered
            draftContract.draftRevision.formData.programIDs = values.programIDs
            draftContract.draftRevision.formData.submissionType =
                values.submissionType as SubmissionTypeT
            draftContract.draftRevision.formData.riskBasedContract =
                yesNoFormValueAsBoolean(values.riskBasedContract)
            draftContract.draftRevision.formData.submissionDescription =
                values.submissionDescription
            draftContract.draftRevision.formData.contractType =
                values.contractType as ContractType

            try {
                const {errors: updateContractErrors} = await updateContract({
                    variables: {
                        input: {
                            // ...draftContract,
                            contractID: draftContract.id,
                            lastSeenUpdatedAt: draftContract.updatedAt,
                            updatedRates: []
                        },
                    },
                })
                if (updateContractErrors) {
                    formikHelpers.setSubmitting(false)
                } else {
                    navigate(redirectPath || `../contract-details`)
                }
            } catch (serverError) {
                setShowAPIErrorBanner(true)
                formikHelpers.setSubmitting(false) // unblock submit button to allow resubmit
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
                            ? activeFormPages(draftSubmission.formData)
                            : STATE_SUBMISSION_FORM_ROUTES
                    }
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission?.unlockInfo}
                    showPageErrorMessage={showAPIErrorBanner}
                />
            </div>
            <FormContainer id="SubmissionType">
                <Formik
                    initialValues={submissionTypeInitialValues}
                    onSubmit={handleFormSubmit}
                    validationSchema={SubmissionTypeFormSchema()}
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        isSubmitting,
                        setSubmitting,
                        setFieldValue,
                    }) => (
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
                                            headingRef={errorSummaryHeadingRef}
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
                                                    {errors.populationCovered}
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
                                            Programs this contract action covers
                                        </Label>
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
                                        {showFieldErrors(errors.programIDs) && (
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
                                                    States are not required to
                                                    submit rates with CHIP-only
                                                    contracts.
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
                                                    summary of your submission
                                                    that highlights any
                                                    important changes CMS
                                                    reviewers will need to be
                                                    aware of
                                                </p>
                                                <ReactRouterLinkWithLogging
                                                    variant="external"
                                                    to={{
                                                        pathname: '/help',
                                                        hash: '#submission-description',
                                                    }}
                                                    target="_blank"
                                                >
                                                    View description examples
                                                </ReactRouterLinkWithLogging>
                                            </>
                                        }
                                    />
                                </fieldset>
                                <PageActions
                                    pageVariant={
                                        isNewSubmission ? 'FIRST' : 'EDIT_FIRST'
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
                                            { setSubmitting },
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
                    )}
                </Formik>
            </FormContainer>
        </>
    )
}

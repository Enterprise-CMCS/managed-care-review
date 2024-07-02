import {
    Form as UswdsForm,
    Fieldset,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers } from 'formik'
import React, { useEffect } from 'react'
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
    CreateHealthPlanPackageInput,
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
import { useHealthPlanPackageForm } from '../../../hooks/useHealthPlanPackageForm'
import { useCurrentRoute } from '../../../hooks'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouteParams } from '../../../hooks/useRouteParams'
import { PageBannerAlerts } from '../PageBannerAlerts'

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
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
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
        unlockInfo,
    } = useHealthPlanPackageForm(id)

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const submissionTypeInitialValues: SubmissionTypeFormValues = {
        populationCovered: draftSubmission?.populationCovered,
        programIDs: draftSubmission?.programIDs ?? [],
        riskBasedContract:
            booleanAsYesNoFormValue(draftSubmission?.riskBasedContract) ?? '',
        submissionDescription: draftSubmission?.submissionDescription ?? '',
        submissionType: draftSubmission?.submissionType ?? '',
        contractType: draftSubmission?.contractType ?? '',
    }

    if (interimState)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />
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

                const input: CreateHealthPlanPackageInput = {
                    populationCovered: values.populationCovered,
                    programIDs: values.programIDs,
                    submissionType: values.submissionType,
                    riskBasedContract: yesNoFormValueAsBoolean(
                        values.riskBasedContract
                    ),
                    submissionDescription: values.submissionDescription,
                    contractType: values.contractType,
                }
                if (!createDraft) {
                    console.info(
                        'PROGRAMMING ERROR, SubmissionType for does have props needed to update a draft.'
                    )
                    return
                }

                const draftSubmission = await createDraft(input)

                if (draftSubmission instanceof Error) {
                    console.error('ah')
                    return
                }
                navigate(
                    `/submissions/${draftSubmission.id}/edit/contract-details`
                )
            } catch (serverError) {
                setShowFormAlert(true)
                formikHelpers.setSubmitting(false) // unblock submit button to allow resubmit
                console.info(
                    'Log: creating new submission failed with server error',
                    serverError
                )
            }
        } else {
            if (draftSubmission === undefined || !updateDraft) {
                console.info(draftSubmission, updateDraft)
                console.info(
                    'ERROR, SubmissionType for does not have props needed to update a draft.'
                )
                return
            }

            // set new values
            draftSubmission.populationCovered = values.populationCovered
            draftSubmission.programIDs = values.programIDs
            draftSubmission.submissionType =
                values.submissionType as SubmissionTypeT
            draftSubmission.riskBasedContract = yesNoFormValueAsBoolean(
                values.riskBasedContract
            )
            draftSubmission.submissionDescription = values.submissionDescription
            draftSubmission.contractType = values.contractType as ContractType

            try {
                const updatedDraft = await updateDraft(draftSubmission)
                if (updatedDraft instanceof Error) {
                    formikHelpers.setSubmitting(false)
                } else {
                    navigate(redirectPath || `../contract-details`)
                }
            } catch (serverError) {
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
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={
                        draftSubmission
                            ? activeFormPages(draftSubmission)
                            : STATE_SUBMISSION_FORM_ROUTES
                    }
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
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
                                    {showFormAlert && <GenericApiErrorBanner />}

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
                                                <PoliteErrorMessage>
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
                                            <PoliteErrorMessage>
                                                {errors.programIDs}
                                            </PoliteErrorMessage>
                                        )}
                                        <ProgramSelect
                                            name="programIDs"
                                            inputId="programIDs"
                                            programIDs={values.programIDs}
                                            contractProgramsOnly
                                            aria-label="Programs this contract action covers (required)"
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
                                                <PoliteErrorMessage>
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
                                                <PoliteErrorMessage>
                                                    {errors.contractType}
                                                </PoliteErrorMessage>
                                            )}
                                            <FieldRadio
                                                id="baseContract"
                                                name="contractType"
                                                label="Base contract"
                                                aria-required
                                                value={'BASE'}
                                            />
                                            <FieldRadio
                                                id="amendmentContract"
                                                name="contractType"
                                                label="Amendment to base contract"
                                                aria-required
                                                value={'AMENDMENT'}
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
                                />
                            </UswdsForm>
                        </>
                    )}
                </Formik>
            </FormContainer>
        </>
    )
}

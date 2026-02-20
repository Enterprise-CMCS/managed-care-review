import {
    Form as UswdsForm,
    Fieldset,
    FormGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors, FormikHelpers } from 'formik'
import React, { useState, useEffect } from 'react'
import {
    useNavigate,
    useLocation,
    generatePath,
    matchPath,
} from 'react-router-dom'
import {
    DynamicStepIndicator,
    ErrorSummary,
    FieldRadio,
    FieldCharacterCount,
    FieldYesNo,
    FormNotificationContainer,
    PoliteErrorMessage,
    ReactRouterLinkWithLogging,
    PageActions,
} from '../../../../components'
import {
    PopulationCoveredRecord,
    SubmissionTypeRecord,
} from '@mc-review/submissions'
import { isContractWithProvisions } from '@mc-review/submissions'
import {
    SubmissionType as SubmissionTypeT,
    CreateContractInput,
    ContractDraftRevisionFormDataInput,
    UpdateContractDraftRevisionInput,
    ContractType,
    PopulationCoveredType,
    ContractSubmissionType,
} from '../../../../gen/gqlClient'
import styles from '../../StateSubmissionForm.module.scss'
import { ProgramSelect } from '../../../../components'
import {
    activeFormPages,
    renameKey,
    type ContractFormPageProps,
} from '../../submissionUtils'
import {
    booleanAsYesNoFormValue,
    yesNoFormValueAsBoolean,
} from '../../../../components/Form/FieldYesNo'
import { SubmissionTypeFormSchema } from './SubmissionTypeSchema'
import {
    RoutesRecord,
    RouteT,
    STATE_SUBMISSION_FORM_ROUTES_WITHOUT_SUPPORTING_DOCS,
    STATE_SUBMISSION_FORM_ROUTES,
    ContractSubmissionTypeRecord,
} from '@mc-review/constants'
import { FormContainer } from '../../../../components'
import { useCurrentRoute } from '../../../../hooks'
import { ErrorOrLoadingPage } from '../../SharedSubmissionComponents'
import { useAuth } from '../../../../contexts/AuthContext'
import { useRouteParams } from '../../../../hooks'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { useContractForm } from '../../../../hooks/useContractForm'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { ContactSupportLink } from '../../../../components/ErrorAlert/ContactSupportLink'
import { useFocusOnRender } from '../../../../hooks/useFocusOnRender'
import { usePage } from '../../../../contexts/PageContext'

export interface SubmissionTypeFormValues {
    populationCovered?: PopulationCoveredType
    programIDs: string[]
    riskBasedContract: string
    submissionDescription: string
    submissionType: string
    contractType: string
    contractSubmissionType: ContractSubmissionType
}

type FormError =
    FormikErrors<SubmissionTypeFormValues>[keyof FormikErrors<SubmissionTypeFormValues>]

export const SubmissionType = ({
    showValidations = false,
}: ContractFormPageProps): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [draftSaved, setDraftSaved] = useState(false)
    useFocusOnRender(draftSaved, '[data-testid="saveAsDraftSuccessBanner"]')
    const [showAPIErrorBanner, setShowAPIErrorBanner] = useState<
        boolean | string
    >(false) // string is a custom error message, defaults to generic message when true
    const { updateActiveMainContent } = usePage()

    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()
    const navigate = useNavigate()
    const location = useLocation()
    const ldClient = useLDClient()
    const { id } = useRouteParams()
    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )
    const showEqroSubmissions: boolean = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )

    //Toggle isNewSubmission condition based on EQRO feature flag
    const isNewSubmission = showEqroSubmissions
        ? matchPath(
              RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
              location.pathname
          )
        : location.pathname === '/submissions/new'

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
        contractSubmissionType: 'HEALTH_PLAN',
    }
    const activeMainContentId = 'submissionTypePageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (interimState) {
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />
    }

    const handleFormSubmit = async (
        values: SubmissionTypeFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            type: 'SAVE_AS_DRAFT' | 'CANCEL' | 'CONTINUE'
            redirectPath?: RouteT
        }
    ) => {
        if (options.type === 'SAVE_AS_DRAFT' && draftSaved) {
            setDraftSaved(false)
        }
        if (isNewSubmission) {
            const input: CreateContractInput = {
                populationCovered: values.populationCovered!,
                programIDs: values.programIDs,
                submissionType: values.submissionType as SubmissionTypeT,
                riskBasedContract: yesNoFormValueAsBoolean(
                    values.riskBasedContract
                ),
                submissionDescription: values.submissionDescription,
                contractType: values.contractType as ContractType,
                contractSubmissionType: values.contractSubmissionType,
            }

            const draftSubmission = await createDraft(input)
            if (draftSubmission instanceof Error) {
                setSubmitting(false) // unblock submit button to allow resubmit
                console.info(
                    'Log: creating new submission failed with server error',
                    draftSubmission
                )
                return
            }
            if (options.redirectPath) {
                navigate(
                    generatePath(RoutesRecord[options.redirectPath], {
                        id: draftSubmission.id,
                        contractSubmissionType:
                            ContractSubmissionTypeRecord[
                                draftSubmission.contractSubmissionType
                            ],
                    })
                )
            }
        } else {
            setSubmitting(true)
            if (!draftSubmission) {
                console.info(
                    'Error updating draft submission. draftSubmission was undefined.'
                )
                setShowAPIErrorBanner(true)
                return
            }
            // remove out __typename name our response formData to retain existing formData from other pages.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { __typename, ...formData } =
                draftSubmission.draftRevision.formData

            // set new values
            const updatedDraftSubmissionFormData: ContractDraftRevisionFormDataInput =
                {
                    ...formData,
                    contractType: values.contractType as ContractType,
                    submissionDescription: values.submissionDescription,
                    riskBasedContract: yesNoFormValueAsBoolean(
                        values.riskBasedContract
                    ),
                    populationCovered: values.populationCovered,
                    submissionType: values.submissionType as SubmissionTypeT,
                    programIDs: values.programIDs,
                }

            //TODO: Move this to the API, it does nothing here.
            if (!isContractWithProvisions(draftSubmission)) {
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
            } else if (options.type === 'SAVE_AS_DRAFT' && updatedDraft) {
                setDraftSaved(true)
                setSubmitting(false)
            } else {
                //Can assume it was a 'CONTINUE' type at this point
                if (options.redirectPath) {
                    navigate(
                        generatePath(RoutesRecord[options.redirectPath], {
                            id: id,
                            contractSubmissionType: 'health-plan',
                        })
                    )
                }
            }
        }
    }

    // Checks if any of the child rates in this submission were ever submitted
    const hasPreviouslySubmittedRates = Boolean(
        draftSubmission?.draftRates.some(
            // A rate will be DRAFT if it had never been submitted before.
            (dr) =>
                dr.parentContractID === draftSubmission?.id &&
                dr.consolidatedStatus !== 'DRAFT'
        )
    )

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
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={
                        draftSubmission
                            ? activeFormPages(
                                  draftSubmission.draftRevision.formData,
                                  hideSupportingDocs
                              )
                            : hideSupportingDocs
                              ? STATE_SUBMISSION_FORM_ROUTES_WITHOUT_SUPPORTING_DOCS
                              : STATE_SUBMISSION_FORM_ROUTES
                    }
                    currentFormPage={
                        draftSubmission ? currentRoute : 'SUBMISSIONS_TYPE'
                    }
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission?.draftRevision.unlockInfo}
                    showPageErrorMessage={
                        showPageErrorMessage || showAPIErrorBanner
                    }
                    draftSaved={draftSaved}
                />
            </FormNotificationContainer>
            <FormContainer id="SubmissionType">
                <Formik
                    initialValues={submissionTypeInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            type: 'CONTINUE',
                            redirectPath: 'SUBMISSIONS_CONTRACT_DETAILS',
                        })
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
                            <UswdsForm
                                className={styles.formContainer}
                                id="SubmissionTypeForm"
                                aria-label={
                                    isNewSubmission
                                        ? 'New Submission Form'
                                        : 'Submission Type Form'
                                }
                                onSubmit={handleSubmit}
                            >
                                <fieldset className="usa-fieldset">
                                    <legend className="srOnly">
                                        Submission type
                                    </legend>

                                    {shouldValidate && (
                                        <ErrorSummary
                                            errors={renameKey(
                                                errors,
                                                'programIDs',
                                                '#programIDs'
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
                                                disabled={
                                                    hasPreviouslySubmittedRates
                                                }
                                                parent_component_heading="Which populations does this contract action cover?"
                                                radio_button_title={
                                                    PopulationCoveredRecord[
                                                        'CHIP'
                                                    ]
                                                }
                                            />
                                            {hasPreviouslySubmittedRates && (
                                                <div
                                                    role="note"
                                                    className="mcr-note padding-top-2"
                                                >
                                                    If you need to change your
                                                    response, contact CMS.
                                                </div>
                                            )}
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
                                            aria-required={
                                                !hasPreviouslySubmittedRates
                                            }
                                            defaultValue={values.submissionType}
                                            legend="Choose a submission type"
                                            id="submissionType"
                                            disabled={
                                                hasPreviouslySubmittedRates
                                            }
                                        >
                                            {!hasPreviouslySubmittedRates && (
                                                <span
                                                    className={
                                                        styles.requiredOptionalText
                                                    }
                                                >
                                                    Required
                                                </span>
                                            )}
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
                                            {hasPreviouslySubmittedRates && (
                                                <div
                                                    role="note"
                                                    className="mcr-note padding-top-2"
                                                >
                                                    If you need to change your
                                                    response, contact CMS.
                                                </div>
                                            )}
                                            {values.populationCovered ===
                                                'CHIP' && (
                                                <div
                                                    role="note"
                                                    aria-labelledby="submissionType"
                                                    className="mcr-note padding-top-2"
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
                                    <FieldCharacterCount
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
                                                <span
                                                    id="submissionDescriptionHelp"
                                                    className="margin-bottom-2"
                                                >
                                                    Provide a 1-2 paragraph
                                                    summary of your submission
                                                    that highlights any
                                                    important changes CMS
                                                    reviewers will need to be
                                                    aware of.
                                                </span>
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
                                            setSubmitting,
                                            {
                                                type: 'SAVE_AS_DRAFT',
                                            }
                                        )
                                    }}
                                    actionInProgress={isSubmitting}
                                    backOnClickUrl={
                                        RoutesRecord.DASHBOARD_SUBMISSIONS
                                    }
                                    continueOnClickUrl={
                                        RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS
                                    }
                                />
                            </UswdsForm>
                        )
                    }}
                </Formik>
            </FormContainer>
        </div>
    )
}

import React, { useEffect, useState } from 'react'
import {
    ErrorSummary,
    FieldCheckbox,
    FieldRadio,
    FieldTextarea,
    FormContainer,
    PageActions,
    PoliteErrorMessage,
    ProgramSelect,
    ReactRouterLinkWithLogging,
} from '../../../../components'
import { Fieldset, Form, FormGroup, Label, Link } from '@trussworks/react-uswds'
import { RoutesRecord } from '@mc-review/constants'
import { generatePath, useNavigate, matchPath } from 'react-router-dom'
import { useRouteParams } from '../../../../hooks'
import styles from '../../StateSubmissionForm.module.scss'
import { usePage } from '../../../../contexts/PageContext'
import { useContractForm } from '../../../../hooks/useContractForm'
import {
    ContractType,
    CreateContractInput,
    ManagedCareEntity,
    PopulationCoveredType,
} from '../../../../gen/gqlClient'
import { Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import {
    ManagedCareEntityRecord,
    PopulationCoveredRecord,
} from '@mc-review/submissions'
import { ContactSupportLink } from '../../../../components/ErrorAlert/ContactSupportLink'
import { renameKey } from '../../submissionUtils'

interface EQROSubmissionTypeFormValues {
    populationCovered?: PopulationCoveredType
    programIDs: string[]
    managedCareEntities: ManagedCareEntity[]
    contractType?: ContractType
    submissionDescription: string
}

type FormError =
    FormikErrors<EQROSubmissionTypeFormValues>[keyof FormikErrors<EQROSubmissionTypeFormValues>]

export const EQROSubmissionDetails = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()

    const isNewSubmission = matchPath(
        RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
        location.pathname
    )

    const { createDraft } = useContractForm(id)

    const [shouldValidate, setShouldValidate] = useState(false)
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const activeMainContentId = 'submissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const onSubmit = async (values: EQROSubmissionTypeFormValues) => {
        if (isNewSubmission) {
            const input: CreateContractInput = {
                populationCovered: values.populationCovered!,
                programIDs: values.programIDs,
                managedCareEntities: values.managedCareEntities,
                contractType: values.contractType!,
                submissionDescription: values.submissionDescription,
                submissionType: 'CONTRACT_ONLY',
                contractSubmissionType: 'EQRO',
            }

            const draftSubmission = await createDraft(input)

            if (draftSubmission instanceof Error) {
                console.info(
                    'Log: creating new submission failed with server error',
                    draftSubmission
                )
                return
            }

            navigate(
                generatePath(RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS, {
                    id: draftSubmission.id,
                    contractSubmissionType,
                })
            )
        } else {
            navigate(
                generatePath(RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS, {
                    id: id,
                    contractSubmissionType,
                })
            )
        }
    }

    const initialValues = {
        populationCovered: undefined,
        programIDs: [],
        managedCareEntities: [],
        contractType: undefined,
        submissionDescription: '',
    }
    const EqroSubmissionSchema = Yup.object().shape({
        populationCovered: Yup.string().required(
            'You must select the population included in EQRO activities'
        ),
        programIDs: Yup.array().min(1, 'You must select at least one program'),
        managedCareEntities: Yup.array().min(
            1,
            'You must select at least one entity'
        ),
        contractType: Yup.string().required('You must choose a contract type'),
        submissionDescription: Yup.string().required(
            'You must provide a description of any major changes or updates'
        ),
    })
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()

    const formHeading = 'EQRO Submission Details Form'

    return (
        <div id={activeMainContentId}>
            <FormContainer id="SubmissionDetails">
                <Formik
                    initialValues={initialValues}
                    onSubmit={(values) => onSubmit(values)}
                    validationSchema={EqroSubmissionSchema}
                >
                    {({
                        errors,
                        values,
                        handleSubmit,
                        isSubmitting,
                        setSubmitting,
                        setFieldValue,
                    }) => (
                        <Form
                            className={styles.formContainer}
                            onSubmit={handleSubmit}
                        >
                            <fieldset className="usa-fieldset">
                                <legend className="srOnly">
                                    Submission details
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
                                        legend="Populations included in EQRO activities"
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
                                            <PoliteErrorMessage formFieldLabel="Populations included in EQRO activities">
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
                                            list_position={1}
                                            list_options={3}
                                            parent_component_heading="Populations included in EQRO activities"
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
                                            list_position={2}
                                            list_options={3}
                                            parent_component_heading="Populations included in EQRO activities"
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
                                                PopulationCoveredRecord['CHIP']
                                            }
                                            value={'CHIP'}
                                            list_position={3}
                                            list_options={3}
                                            parent_component_heading="Populations included in EQRO activities"
                                            radio_button_title={
                                                PopulationCoveredRecord['CHIP']
                                            }
                                        />
                                    </Fieldset>
                                </FormGroup>
                                <FormGroup
                                    error={showFieldErrors(errors.programIDs)}
                                >
                                    <Label htmlFor="programIDs">
                                        Programs reviewed by this EQRO
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
                                        <PoliteErrorMessage formFieldLabel="Programs reviewed by this EQRO">
                                            {errors.programIDs}
                                        </PoliteErrorMessage>
                                    )}
                                    <ProgramSelect
                                        name="programIDs"
                                        inputId="programIDs"
                                        programIDs={values.programIDs}
                                        contractProgramsOnly
                                        aria-label="Programs reviewed by this EQRO (required)"
                                        label="Programs reviewed by this EQRO"
                                    />
                                </FormGroup>
                                <FormGroup
                                    error={Boolean(
                                        showFieldErrors(
                                            errors.managedCareEntities
                                        )
                                    )}
                                >
                                    <Fieldset
                                        aria-required
                                        legend="Managed Care entities reviewed by this EQRO"
                                    >
                                        <span
                                            className={
                                                styles.requiredOptionalText
                                            }
                                        >
                                            Required
                                        </span>
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
                                            <span>Check all that apply</span>
                                        </div>
                                        {showFieldErrors(
                                            errors.managedCareEntities
                                        ) && (
                                            <PoliteErrorMessage formFieldLabel="Managed Care entities reviewed by this EQRO">
                                                {errors.managedCareEntities}
                                            </PoliteErrorMessage>
                                        )}
                                        <FieldCheckbox
                                            id="managedCareOrganization"
                                            name="managedCareEntities"
                                            label={ManagedCareEntityRecord.MCO}
                                            value="MCO"
                                            heading="Managed Care entities reviewed by this EQRO"
                                            parent_component_heading={
                                                formHeading
                                            }
                                        />
                                        <FieldCheckbox
                                            id="prepaidInpatientHealthPlan"
                                            name="managedCareEntities"
                                            label={ManagedCareEntityRecord.PIHP}
                                            value="PIHP"
                                            heading="Managed Care entities reviewed by this EQRO"
                                            parent_component_heading={
                                                formHeading
                                            }
                                        />
                                        <FieldCheckbox
                                            id="prepaidAmbulatoryHealthPlans"
                                            name="managedCareEntities"
                                            label={ManagedCareEntityRecord.PAHP}
                                            value="PAHP"
                                            heading="Managed Care entities reviewed by this EQRO"
                                            parent_component_heading={
                                                formHeading
                                            }
                                        />
                                        <FieldCheckbox
                                            id="primaryCareCaseManagementEntity"
                                            name="managedCareEntities"
                                            label={ManagedCareEntityRecord.PCCM}
                                            value="PCCM"
                                            heading="Managed Care entities reviewed by this EQRO"
                                            parent_component_heading={
                                                formHeading
                                            }
                                        />
                                    </Fieldset>
                                </FormGroup>
                                <FormGroup
                                    error={showFieldErrors(errors.contractType)}
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
                                            <span
                                                id="submissionDescriptionHelp"
                                                className="margin-bottom-2"
                                            >
                                                Provide a 1-2 paragraph summary
                                                of your submission that
                                                highlights any important changes
                                                CMS reviewers will need to be
                                                aware of
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
                                pageVariant={'FIRST'}
                                backOnClick={() =>
                                    navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                                }
                                continueOnClick={() => {
                                    setShouldValidate(true)
                                    setFocusErrorSummaryHeading(true)
                                    console.info(
                                        'Continue on click placeholder function'
                                    )
                                }}
                                saveAsDraftOnClick={() =>
                                    console.info(
                                        'Save as draft function placeholder'
                                    )
                                }
                                backOnClickUrl={
                                    RoutesRecord.DASHBOARD_SUBMISSIONS
                                }
                                continueOnClickUrl={
                                    RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS
                                }
                            />
                        </Form>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}

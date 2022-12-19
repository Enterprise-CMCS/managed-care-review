import {
    Form as UswdsForm,
    Fieldset,
    FormGroup,
    Link,
    Label,
} from '@trussworks/react-uswds'
import { Field, Formik, FormikErrors, FormikHelpers } from 'formik'
import React, { useEffect } from 'react'
import {
    Link as ReactRouterLink,
    useNavigate,
    useLocation,
} from 'react-router-dom'
import {
    ErrorSummary,
    FieldRadio,
    FieldTextarea,
    FieldYesNo,
    PoliteErrorMessage,
} from '../../../components'
import { SubmissionTypeRecord } from '../../../constants/healthPlanPackages'
import {
    HealthPlanPackage,
    SubmissionType as SubmissionTypeT,
    useCreateHealthPlanPackageMutation,
    CreateHealthPlanPackageInput,
} from '../../../gen/gqlClient'
import { PageActions } from '../PageActions'
import styles from '../StateSubmissionForm.module.scss'
import { GenericApiErrorBanner, ProgramSelect } from '../../../components'
import type { HealthPlanFormPageProps } from '../StateSubmissionForm'
import { useStatePrograms } from '../../../hooks/useStatePrograms'
import {
    booleanAsYesNoFormValue,
    yesNoFormValueAsBoolean,
} from '../../../components/Form/FieldYesNo/FieldYesNo'
import { featureFlags } from '../../../common-code/featureFlags'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { SubmissionTypeFormSchema } from './SubmissionTypeSchema'

export interface SubmissionTypeFormValues {
    programIDs: string[]
    riskBasedContract: string
    submissionDescription: string
    submissionType: string
}
type SubmissionTypeProps = {
    formAlert?: React.ReactElement
    draftSubmission?: HealthPlanFormPageProps['draftSubmission'] // overwrite HealthPlanFormProps because this can be undefined when we start a new submission
    showValidations?: HealthPlanFormPageProps['showValidations']
    updateDraft?: HealthPlanFormPageProps['updateDraft'] // overwrite HealthPlanFormProps because this can be undefined when we start a new submission
}

type FormError =
    FormikErrors<SubmissionTypeFormValues>[keyof FormikErrors<SubmissionTypeFormValues>]
export const SubmissionType = ({
    draftSubmission,
    showValidations = false,
    updateDraft,
}: SubmissionTypeProps): React.ReactElement => {
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)

    const navigate = useNavigate()
    const location = useLocation()
    const isNewSubmission = location.pathname === '/submissions/new'

    const statePrograms = useStatePrograms()

    // Launch Darkly
    const ldClient = useLDClient()
    const showRateCertAssurance = ldClient?.variation(
        featureFlags.RATE_CERT_ASSURANCE.flag,
        featureFlags.RATE_CERT_ASSURANCE.defaultValue
    )

    const [createHealthPlanPackage, { error }] =
        useCreateHealthPlanPackageMutation({
            // This function updates the Apollo Client Cache after we create a new DraftSubmission
            // Without it, we wouldn't show this newly created submission on the dashboard page
            // without a refresh. Anytime a mutation does more than "modify an existing object"
            // you'll need to handle the cache.
            update(cache, { data }) {
                if (data) {
                    cache.modify({
                        fields: {
                            indexHealthPlanPackages(
                                index = { totalCount: 0, edges: [] }
                            ) {
                                const newID = cache.identify(
                                    data.createHealthPlanPackage.pkg
                                )
                                // This isn't quite what is documented, but it's clear this
                                // is how things work from looking at the dev-tools
                                const newRef = { __ref: newID }

                                return {
                                    totalCount: index.totalCount + 1,
                                    edges: [
                                        {
                                            node: newRef,
                                        },
                                        ...index.edges,
                                    ],
                                }
                            },
                        },
                    })
                }
            },
        })

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    if (error && !showFormAlert) {
        setShowFormAlert(true)
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const submissionTypeInitialValues: SubmissionTypeFormValues = {
        programIDs: draftSubmission?.programIDs ?? [],
        riskBasedContract:
            booleanAsYesNoFormValue(draftSubmission?.riskBasedContract) ?? '',
        submissionDescription: draftSubmission?.submissionDescription ?? '',
        submissionType: draftSubmission?.submissionType ?? '',
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
                if (
                    !(
                        values.submissionType === 'CONTRACT_ONLY' ||
                        values.submissionType === 'CONTRACT_AND_RATES'
                    )
                ) {
                    console.log(
                        'unexpected error, attempting to submit a submissionType of ',
                        values.submissionType
                    )
                    return
                }

                const input: CreateHealthPlanPackageInput = {
                    programIDs: values.programIDs,
                    submissionType: values.submissionType,
                    riskBasedContract: yesNoFormValueAsBoolean(
                        values.riskBasedContract
                    ),
                    submissionDescription: values.submissionDescription,
                }

                const result = await createHealthPlanPackage({
                    variables: { input },
                })

                const draftSubmission: HealthPlanPackage | undefined =
                    result?.data?.createHealthPlanPackage.pkg

                if (draftSubmission) {
                    navigate(
                        `/submissions/${draftSubmission.id}/edit/contract-details`
                    )
                }
            } catch (serverError) {
                setShowFormAlert(true)
                formikHelpers.setSubmitting(false) // unblock submit button to allow resubmit
                console.log(
                    'Log: creating new submission failed with server error',
                    serverError
                )
            }
        } else {
            if (draftSubmission === undefined || !updateDraft) {
                console.log(draftSubmission, updateDraft)
                console.log(
                    'ERROR, SubmissionType for does not have props needed to update a draft.'
                )
                return
            }

            // set new values
            draftSubmission.programIDs = values.programIDs
            draftSubmission.submissionType =
                values.submissionType as SubmissionTypeT
            draftSubmission.riskBasedContract = yesNoFormValueAsBoolean(
                values.riskBasedContract
            )
            draftSubmission.submissionDescription = values.submissionDescription

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

    return (
        <Formik
            initialValues={submissionTypeInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={SubmissionTypeFormSchema({
                'rate-cert-assurance': showRateCertAssurance,
            })}
        >
            {({
                values,
                errors,
                handleSubmit,
                isSubmitting,
                setSubmitting,
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
                            <legend className="srOnly">Submission type</legend>
                            {showFormAlert && <GenericApiErrorBanner />}
                            <span id="form-guidance">
                                All fields are required
                            </span>

                            {shouldValidate && (
                                <ErrorSummary
                                    errors={generateErrorSummaryErrors(errors)}
                                    headingRef={errorSummaryHeadingRef}
                                />
                            )}

                            <FormGroup
                                error={showFieldErrors(errors.programIDs)}
                            >
                                <Label htmlFor="programIDs">
                                    Programs this contract action covers
                                </Label>
                                {showFieldErrors(errors.programIDs) && (
                                    <PoliteErrorMessage>
                                        {errors.programIDs}
                                    </PoliteErrorMessage>
                                )}
                                <Field name="programIDs">
                                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                                    {/* @ts-ignore */}
                                    {({ form }) => (
                                        <ProgramSelect
                                            name="programIDs"
                                            inputId="programIDs"
                                            statePrograms={statePrograms}
                                            programIDs={values.programIDs}
                                            aria-label="Programs this contract action covers (required)"
                                            onChange={(selectedOption) =>
                                                form.setFieldValue(
                                                    'programIDs',
                                                    selectedOption.map(
                                                        (item: {
                                                            value: string
                                                        }) => item.value
                                                    )
                                                )
                                            }
                                        />
                                    )}
                                </Field>
                            </FormGroup>
                            <FormGroup
                                error={showFieldErrors(errors.submissionType)}
                            >
                                <Fieldset
                                    className={styles.radioGroup}
                                    role="radiogroup"
                                    aria-required
                                    legend="Submission type"
                                >
                                    {showFieldErrors(errors.submissionType) && (
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
                                    />
                                </Fieldset>
                            </FormGroup>
                            <FormGroup
                                error={showFieldErrors(
                                    errors.riskBasedContract
                                )}
                            >
                                {showRateCertAssurance && (
                                    <FieldYesNo
                                        id="riskBasedContract"
                                        name="riskBasedContract"
                                        label="Is this a risk-based contract?"
                                        hint="See 42 CFR § 438.2"
                                        showError={showFieldErrors(
                                            errors.riskBasedContract
                                        )}
                                    />
                                )}
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
                                        <p id="submissionDescriptionHelp">
                                            Provide a 1-2 paragraph summary of
                                            your submission that highlights any
                                            important changes CMS reviewers will
                                            need to be aware of
                                        </p>
                                        <Link
                                            variant="external"
                                            asCustom={ReactRouterLink}
                                            to={{
                                                pathname: '/help',
                                                hash: '#submission-description',
                                            }}
                                            target="_blank"
                                        >
                                            View description examples
                                        </Link>
                                    </>
                                }
                            />
                        </fieldset>
                        <PageActions
                            pageVariant={
                                isNewSubmission ? 'FIRST' : 'EDIT_FIRST'
                            }
                            backOnClick={() => navigate('/dashboard')}
                            continueOnClick={() => {
                                setShouldValidate(true)
                                setFocusErrorSummaryHeading(true)
                            }}
                            saveAsDraftOnClick={async () => {
                                await handleFormSubmit(
                                    values,
                                    { setSubmitting },
                                    '/dashboard'
                                )
                            }}
                            actionInProgress={isSubmitting}
                        />
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

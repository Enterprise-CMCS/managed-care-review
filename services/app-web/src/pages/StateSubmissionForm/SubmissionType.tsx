import React from 'react'
import * as Yup from 'yup'
import {
    Alert,
    Button,
    ButtonGroup,
    ErrorMessage,
    Form as UswdsForm,
    Fieldset,
    FormGroup,
    Link,
} from '@trussworks/react-uswds'
import {
    Formik,
    FormikHelpers,
    FormikErrors,
    useFormikContext,
} from 'formik'
import { NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../components/PageHeading'
import { useMutation } from '@apollo/client'

import styles from './StateSubmissionForm.module.scss'
import {
    CreateDraftSubmissionDocument,
    DraftSubmission,
    SubmissionType as SubmissionTypeT,
    useUpdateDraftSubmissionMutation,
} from '../../gen/gqlClient'
import { useAuth } from '../../contexts/AuthContext'
import { FieldTextarea } from '../../components/Form/FieldTextarea/FieldTextarea'
import { FieldDropdown } from '../../components/Form/FieldDropdown/FieldDropdown'
import { FieldRadio } from '../../components/Form/FieldRadio/FieldRadio'
import { SubmissionTypeRecord } from '../../constants/submissions'

/*
    Add focus to "first" form element that is invalid when errors exist
    Approx order of form inputs is determined by the Formik schema
*/
const FormikFocusOnErrors = () => {
    const { errors } = useFormikContext()
    const errorKeys = Object.keys(errors)
    React.useEffect(() => {
        if (errorKeys.length > 0) {
            document.getElementsByName(errorKeys[0])[0].focus()
        }
    }, [errorKeys])
    return null
}

// Formik setup
// Should be listed in order of appearance on field to allow errors to focus as expected
const SubmissionTypeFormSchema = Yup.object().shape({
    program: Yup.string(),
    submissionType: Yup.string().required('You must choose a submission type'),
    submissionDescription: Yup.string().required(
        'You must provide a description of any major changes or updates'
    ),
})
export interface SubmissionTypeFormValues {
    programID: string
    submissionDescription: string
    submissionType: string
}
type SubmissionTypeProps = {
    showValidations?: boolean
    draftSubmission?: DraftSubmission
}

type FormError = FormikErrors<SubmissionTypeFormValues>[keyof FormikErrors<SubmissionTypeFormValues>]
export const SubmissionType = ({
    showValidations = false,
    draftSubmission = undefined,
}: SubmissionTypeProps): React.ReactElement => {
    const [showFormAlert, setShowFormAlert] = React.useState(false)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const { loggedInUser: { state: { programs = [] } = {} } = {} } = useAuth()

    const history = useHistory()
    const location = history.location
    const isNewSubmission = location.pathname === '/submissions/new'
    const programOptions: Array<{ id: string; label: string }> = programs.map(
        (program) => {
            return { id: program.id, label: program.name }
        }
    )

    const [createDraftSubmission, { error }] = useMutation(
        CreateDraftSubmissionDocument
    )
    const [
        updateDraftSubmission,
        { error: updateError },
    ] = useUpdateDraftSubmissionMutation()

    if ((error || updateError) && !showFormAlert) {
        setShowFormAlert(true)
        console.log('Log: creating new submission failed with gql error', error)
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const submissionTypeInitialValues: SubmissionTypeFormValues = {
        programID: draftSubmission?.program.id ?? programs[0]?.id, // TODO: change this to be the program selected on the tab
        submissionDescription: draftSubmission?.submissionDescription ?? '',
        submissionType: draftSubmission?.submissionType ?? '',
    }

    const handleFormSubmit = async (
        values: SubmissionTypeFormValues,
        formikHelpers: FormikHelpers<SubmissionTypeFormValues>
    ) => {
        if (isNewSubmission) {
            try {
                const result = await createDraftSubmission({
                    variables: { input: values },
                })

                const draftSubmission: DraftSubmission =
                    result.data.createDraftSubmission.draftSubmission

                if (draftSubmission) {
                    history.push(
                        `/submissions/${draftSubmission.id}/contract-details`
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
            if (draftSubmission === undefined) {
                // this is a sign that we should hoist the saving stuff out of this leaf
                // let's reconsider once we have our second editiable component.
                console.log(
                    'ERROR, when editing a draft, one should always be passed in.'
                )
                return
            }

            // TODO: once we have more values, we'll need to pick the other values out
            // off of the existing draft.
            const updatedDraft = {
                programID: values.programID,
                submissionType: values.submissionType as SubmissionTypeT,
                submissionDescription: values.submissionDescription,
            }

            try {
                await updateDraftSubmission({
                    variables: {
                        input: {
                            submissionID: draftSubmission.id,
                            draftSubmissionUpdates: updatedDraft,
                        },
                    },
                })

                history.push(
                    `/submissions/${draftSubmission.id}/contract-details`
                )
            } catch (serverError) {
                setShowFormAlert(true)
                formikHelpers.setSubmitting(false) // unblock submit button to allow resubmit
                console.log(
                    'Log: updating submission failed with server error',
                    serverError
                )
            }
        }
    }

    return (
        <Formik
            initialValues={submissionTypeInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={SubmissionTypeFormSchema}
            validateOnChange={shouldValidate}
            validateOnBlur={shouldValidate}
        >
            {({
                values,
                errors,
                handleChange,
                handleSubmit,
                isSubmitting,
                isValidating,
                validateForm,
            }) => (
                <>
                    <UswdsForm
                        className="usa-form--large"
                        id="SubmissionTypeForm"
                        aria-label={
                            isNewSubmission
                                ? 'New Submission Form'
                                : 'Submission Type Form'
                        }
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
                            <legend className={styles.formHeader}>
                                <PageHeading headingLevel="h2">
                                    Submission type
                                </PageHeading>
                            </legend>
                            {showFormAlert && (
                                <Alert type="error">Something went wrong</Alert>
                            )}
                            <div className={styles.formContainer}>
                                <span>All fields are required</span>
                                <div className="margin-top-205">
                                    <FieldDropdown
                                        id="programID"
                                        name="programID"
                                        label="Program"
                                        showError={showFieldErrors(
                                            errors.programID
                                        )}
                                        options={programOptions}
                                    />
                                </div>
                                <div className="margin-top-5">
                                    <FormGroup error={showFieldErrors(
                                                errors.submissionType
                                            )}>
                                        <Fieldset legend="Choose submission type">
                                            {showFieldErrors(
                                                errors.submissionType
                                            ) && (
                                                <ErrorMessage>
                                                    {errors.submissionType}
                                                </ErrorMessage>
                                            )}
                                            <FieldRadio
                                                aria-required
                                                checked={
                                                    values.submissionType ===
                                                    SubmissionTypeT.ContractOnly
                                                }
                                                id="contractOnly"
                                                name="submissionType"
                                                label={
                                                    SubmissionTypeRecord[
                                                        SubmissionTypeT.ContractOnly
                                                    ]
                                                }
                                                value={SubmissionTypeT.ContractOnly}
                                            />
                                            <FieldRadio
                                                aria-required
                                                checked={
                                                    values.submissionType ===
                                                    SubmissionTypeT.ContractAndRates
                                                }
                                                id="contractRate"
                                                name="submissionType"
                                                label={
                                                    SubmissionTypeRecord[
                                                        SubmissionTypeT
                                                            .ContractAndRates
                                                    ]
                                                }
                                                value={
                                                    SubmissionTypeT.ContractAndRates
                                                }
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                </div>
                                <div className="margin-top-5">
                                    <FieldTextarea
                                        label="Submission description"
                                        id="submissionDescription"
                                        name="submissionDescription"
                                        showError={showFieldErrors(
                                            errors.submissionDescription
                                        )}
                                        hint={
                                            <>
                                                <Link
                                                    variant="nav"
                                                    href={
                                                        '/help/submission-description-examples'
                                                    }
                                                    target="_blank"
                                                >
                                                    View description examples
                                                </Link>

                                                <p>
                                                    Provide a description of any
                                                    major changes or updates
                                                </p>
                                            </>
                                        }
                                    />
                                </div>
                            </div>
                            <ButtonGroup
                                type="default"
                                className={styles.buttonGroup}
                            >
                                <Button
                                    type="button"
                                    secondary
                                    onClick={() =>
                                        validateForm()
                                            .then(() => {
                                                setShouldValidate(true)
                                            })
                                            .catch(() =>
                                                console.warn('Validation Error')
                                            )
                                    }
                                >
                                    Test Validation
                                </Button>
                                <Link
                                    asCustom={NavLink}
                                    className="usa-button usa-button--outline"
                                    variant="unstyled"
                                    to="/dashboard"
                                >
                                    Cancel
                                </Link>
                                <Button type="submit" disabled={isSubmitting}>
                                    Continue
                                </Button>
                            </ButtonGroup>
                        </fieldset>
                        <FormikFocusOnErrors />
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

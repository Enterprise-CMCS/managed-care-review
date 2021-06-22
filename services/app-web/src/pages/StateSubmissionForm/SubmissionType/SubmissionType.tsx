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
import { Formik, FormikHelpers, FormikErrors, useFormikContext } from 'formik'
import { NavLink, useHistory, Link as ReactRouterLink } from 'react-router-dom'
import { useMutation } from '@apollo/client'

import PageHeading from '../../../components/PageHeading'
import {
    CreateDraftSubmissionDocument,
    DraftSubmission,
    SubmissionType as SubmissionTypeT,
    useUpdateDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import { useAuth } from '../../../contexts/AuthContext'
import { FieldTextarea } from '../../../components/Form/FieldTextarea/FieldTextarea'
import { FieldDropdown } from '../../../components/Form/FieldDropdown/FieldDropdown'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { SubmissionTypeRecord } from '../../../constants/submissions'
import { updatesFromSubmission } from '../updateSubmissionTransform'

import styles from '../StateSubmissionForm.module.scss'

/*
    Add focus to "first" form element that is invalid when errors exist
    Approx order of form inputs is determined by the Formik schema
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        programID: draftSubmission?.program.id ?? programs[0]?.id,
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

            const updatedDraft = updatesFromSubmission(draftSubmission)

            updatedDraft.programID = values.programID
            updatedDraft.submissionType = values.submissionType as SubmissionTypeT
            updatedDraft.submissionDescription = values.submissionDescription

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
        >
            {({
                values,
                errors,
                handleSubmit,
                isSubmitting,
                isValidating,
                validateForm,
            }) => (
                <>
                    <PageHeading
                        className={styles.formHeader}
                        headingLevel="h2"
                    >
                        Submission type
                    </PageHeading>
                    <UswdsForm
                        className={styles.formContainer}
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
                            <legend className="srOnly">Submission type</legend>
                            {showFormAlert && (
                                <Alert type="error">Something went wrong</Alert>
                            )}
                            <span>All fields are required</span>
                            <FieldDropdown
                                id="programID"
                                name="programID"
                                label="Program"
                                showError={showFieldErrors(errors.programID)}
                                options={programOptions}
                            />
                            <FormGroup
                                error={showFieldErrors(errors.submissionType)}
                            >
                                <Fieldset
                                    className={styles.radioGroup}
                                    legend="Choose submission type"
                                >
                                    {showFieldErrors(errors.submissionType) && (
                                        <ErrorMessage>
                                            {errors.submissionType}
                                        </ErrorMessage>
                                    )}
                                    <FieldRadio
                                        aria-required
                                        checked={
                                            values.submissionType ===
                                            'CONTRACT_ONLY'
                                        }
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
                                        aria-required
                                        checked={
                                            values.submissionType ===
                                            'CONTRACT_AND_RATES'
                                        }
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
                                            asCustom={ReactRouterLink}
                                            to={{
                                                pathname: '/help',
                                                hash: '#submission-description',
                                            }}
                                        >
                                            View description examples
                                        </Link>

                                        <p>
                                            Provide a description of any major
                                            changes or updates
                                        </p>
                                    </>
                                }
                            />
                        </fieldset>
                        <ButtonGroup
                            type="default"
                            className={styles.buttonGroup}
                        >
                            <Link
                                asCustom={NavLink}
                                className={`${styles.outlineButtonLink} usa-button usa-button--outline`}
                                to="/dashboard"
                            >
                                Cancel
                            </Link>
                            <Button type="submit" disabled={isSubmitting}>
                                Continue
                            </Button>
                        </ButtonGroup>
                        {/* <FormikFocusOnErrors /> */}
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}

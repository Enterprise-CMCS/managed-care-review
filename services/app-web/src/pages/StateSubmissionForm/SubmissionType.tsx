import React from 'react'
import * as Yup from 'yup'
import {
    Button,
    ButtonGroup,
    ErrorMessage,
    Form as UswdsForm,
    Fieldset,
    Radio,
    FormGroup,
    Dropdown,
    Link,
    Label,
    Textarea,
} from '@trussworks/react-uswds'
import { Field, Formik, FormikHelpers, FormikErrors } from 'formik'
import { NavLink, useHistory } from 'react-router-dom'

import styles from './StateSubmissionForm.module.scss'
import { useAuth } from '../../contexts/AuthContext'

// Formik setup
const SubmissionTypeFormSchema = Yup.object().shape({
    program: Yup.string(),
    submissionDescription: Yup.string().required(
        'You must provide a description of any major changes or updates'
    ),
    submissionType: Yup.string().required('You must choose a submission type'),
})
export interface SubmissionTypeFormValues {
    program: string
    submissionDescription: string
    submissionType: string
}
export const SubmissionTypeInitialValues: SubmissionTypeFormValues = {
    program: '',
    submissionDescription: '',
    submissionType: '',
}
type SubmissionTypeProps = {
    showValidations?: boolean
}

type FormError = FormikErrors<SubmissionTypeFormValues>[keyof FormikErrors<SubmissionTypeFormValues>]

export const SubmissionType = ({
    showValidations = false,
}: SubmissionTypeProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const { loggedInUser: { state: { programs = [] } = {} } = {} } = useAuth()
    const history = useHistory()

    const showError = (error?: FormError) => shouldValidate && Boolean(error)

    const handleFormSubmit = (
        values: SubmissionTypeFormValues,
        formikHelpers: FormikHelpers<SubmissionTypeFormValues>
    ) => {
        // TODO: if /new createDraftSubmission api call, if /:id/submisssion-type saveDraftSubmission
        console.log('mock save draft submission', values)

        formikHelpers.setSubmitting(false)
        // TODO: use id of draft submission
        history.push('/submissions/1/contract-details')
    }

    return (
        <Formik
            initialValues={SubmissionTypeInitialValues}
            onSubmit={handleFormSubmit}
            validationSchema={SubmissionTypeFormSchema}
            validateOnChange={shouldValidate}
            validateOnBlur={shouldValidate}
        >
            {({
                values,
                errors,
                handleSubmit,
                isSubmitting,
                isValidating,
                validateForm,
            }) => (
                <UswdsForm
                    className="usa-form--large"
                    id="SubmissionTypeForm"
                    aria-label="New Submission Form"
                    onSubmit={(e) => {
                        e.preventDefault()
                        validateForm()
                            .then(() => {
                                setShouldValidate(true)
                            })
                            .catch(() => console.warn('Validation Error'))

                        if (!isValidating) handleSubmit()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className={styles.formHeader}>
                            <h2>Submission type</h2>
                        </legend>
                        <div className={styles.formContainer}>
                            <span>All fields are required</span>
                            <FormGroup className={styles.formGroup}>
                                <Label htmlFor="program">Program</Label>
                                <Field
                                    id="program"
                                    name="program"
                                    as={Dropdown}
                                >
                                    {programs.map((program) => (
                                        <option
                                            key={program.name}
                                            value={program.name}
                                        >
                                            {program.name}
                                        </option>
                                    ))}
                                </Field>
                            </FormGroup>

                            <FormGroup className={styles.formGroup}>
                                <Fieldset legend="Choose submission type">
                                    {showError(errors.submissionType) && (
                                        <ErrorMessage>
                                            {errors.submissionType}
                                        </ErrorMessage>
                                    )}
                                    <Field
                                        as={Radio}
                                        checked={
                                            values.submissionType ===
                                            'contractOnly'
                                        }
                                        id="contractOnly"
                                        name="submissionType"
                                        label="Contract action only"
                                        value="contractOnly"
                                    />
                                    <Field
                                        as={Radio}
                                        checked={
                                            values.submissionType ===
                                            'contractRate'
                                        }
                                        id="contractRate"
                                        name="submissionType"
                                        label="Contract action and rate certification"
                                        value="contractRate"
                                    />
                                </Fieldset>
                            </FormGroup>

                            <FormGroup className={styles.formGroupLast}>
                                <Label htmlFor="submissionDescription">
                                    Submission description
                                </Label>
                                {showError(errors.submissionDescription) && (
                                    <ErrorMessage>
                                        {errors.submissionDescription}
                                    </ErrorMessage>
                                )}
                                <Link
                                    variant="nav"
                                    href={
                                        '/help/submission-description-examples'
                                    }
                                    target={'_blank'}
                                >
                                    View description examples
                                </Link>
                                <p className="usa-hint margin-top-1">
                                    Provide a description of any major changes
                                    or updates
                                </p>
                                <Field
                                    as={Textarea}
                                    id="submissionDescription"
                                    name="submissionDescription"
                                    value={values.submissionDescription}
                                    error={showError(
                                        errors.submissionDescription
                                    )}
                                />
                            </FormGroup>
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
                </UswdsForm>
            )}
        </Formik>
    )
}

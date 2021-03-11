import React from 'react'
import { Field, useFormikContext, FormikErrors } from 'formik'
import {
    ErrorMessage,
    Fieldset,
    Radio,
    FormGroup,
    Dropdown,
    Link,
    Label,
    Textarea,
} from '@trussworks/react-uswds'

import styles from './StateSubmissionForm.module.scss'
import { StateSubmissionFormValues } from './StateSubmissionForm'
import { useAuth } from '../../contexts/AuthContext'

type SubmissionTypeProps = {
    errors: FormikErrors<StateSubmissionFormValues>
    showValidations: boolean
}

type FormError = FormikErrors<StateSubmissionFormValues>[keyof FormikErrors<StateSubmissionFormValues>]

export const SubmissionType = ({
    errors,
    showValidations,
}: SubmissionTypeProps): React.ReactElement => {
    const { values } = useFormikContext<StateSubmissionFormValues>()
    const { loggedInUser: { state: { programs = [] } = {} } = {} } = useAuth()

    const showError = (error?: FormError) => showValidations && Boolean(error)

    return (
        <>
            <FormGroup className={styles.formGroup}>
                <Label htmlFor="program">Program</Label>
                <Field id="program" name="program" as={Dropdown}>
                    {programs.map((program) => (
                        <option key={program.name} value={program.name}>
                            {program.name}
                        </option>
                    ))}
                </Field>
            </FormGroup>

            <FormGroup className={styles.formGroup}>
                <Fieldset legend="Choose submission type">
                    {showError(errors.submissionType) && (
                        <ErrorMessage>{errors.submissionType}</ErrorMessage>
                    )}
                    <Field
                        as={Radio}
                        id="contractOnly"
                        name="submissionType"
                        label="Contract action only"
                        value="contractOnly"
                    />
                    <Field
                        as={Radio}
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
                    <ErrorMessage>{errors.submissionDescription}</ErrorMessage>
                )}
                <Link
                    variant="nav"
                    href={'/help/submission-description-examples'}
                    target={'_blank'}
                >
                    View description examples
                </Link>
                <p className="usa-hint margin-top-1">
                    Provide a description of any major changes or updates
                </p>
                <Field
                    as={Textarea}
                    id="submissionDescription"
                    name="submissionDescription"
                    value={values.submissionDescription}
                    error={showError(errors.submissionDescription)}
                />
            </FormGroup>
        </>
    )
}

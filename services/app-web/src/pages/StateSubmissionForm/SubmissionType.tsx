import React from 'react'
import { Field, useFormikContext } from 'formik'
import {
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
// import { useAuth } from '../../contexts/AuthContext'
export const SubmissionType = (): React.ReactElement => {
    const { values } = useFormikContext<StateSubmissionFormValues>()

    // TODO: get program options from loggedInUser.state
    // const {
    //     loggedInUser,
    //     //         state: { programs },
    // } = useAuth()

    return (
        <>
            <FormGroup className={styles.formGroup}>
                <Label htmlFor="program">Program</Label>
                <Field id="program" name="program" as={Dropdown}>
                    <option value="cccPlus">CCC Plus</option>
                    <option value="medallion">Medalion</option>
                </Field>
            </FormGroup>
            <FormGroup className={styles.formGroup}>
                <Fieldset legend="Choose submission type">
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
                <Link
                    variant="nav"
                    href={
                        '/SubmissionDescExamples'
                    }
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
                />
            </FormGroup>
        </>
    )
}

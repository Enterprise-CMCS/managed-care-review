import React from 'react'
import { Formik } from 'formik'
import {
    GridContainer,
    Form as UswdsForm,
    ButtonGroup,
    Link,
    Button,
} from '@trussworks/react-uswds'

import { SubmissionType } from './SubmissionType'

import styles from './StateSubmissionForm.module.scss'
export interface StateSubmissionFormValues {
    program: string
    submissionDescription: string
    submissionType: string
}

const STEPS = {
    SUBMISSION_TYPE: 'Submission type',
}

export const StateSubmissionForm = (): React.ReactElement => {
    // setActiveStep will be used once there are multiple form pages
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeStep, setActiveStep] = React.useState(STEPS.SUBMISSION_TYPE)
    const initialValues: StateSubmissionFormValues = {
        program: '',
        submissionDescription: '',
        submissionType: '',
    }

    const handleFormSubmit = () => {
        console.log('mock save draft submission')
    }

    return (
        <GridContainer>
            <Formik
                initialValues={initialValues}
                onSubmit={(values, actions) => {
                    console.log(values)
                    handleFormSubmit()
                    actions.setSubmitting(false)
                }}
            >
                {({ handleSubmit }) => (
                    <UswdsForm
                        className="usa-form--large"
                        id="stateSubmissionForm"
                        onSubmit={handleSubmit}
                    >
                        <fieldset className="usa-fieldset">
                            <legend className={styles.formHeader}>
                                <h2>
                                    {activeStep}
                                </h2>
                            </legend>
                            <div className={styles.formContainer}>
                                <span>All fields are required</span>
                                <SubmissionType />
                            </div>
                            <ButtonGroup
                                type="default"
                                className={styles.buttonGroup}
                            >
                                <Link
                                    href="#"
                                    className="usa-button usa-button--outline"
                                >
                                    Cancel
                                </Link>
                                <Button type="submit">Continue</Button>
                            </ButtonGroup>
                        </fieldset>
                    </UswdsForm>
                )}
            </Formik>
        </GridContainer>
    )
}

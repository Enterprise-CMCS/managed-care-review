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
}

const STEPS = {
    SUBMISSION_TYPE: 'Submission type',
}

export const StateSubmissionForm = (): React.ReactElement => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeStep, setActiveStep] = React.useState(STEPS.SUBMISSION_TYPE)
    const initialValues: StateSubmissionFormValues = {
        program: '',
    }

    const handleFormSubmit = () => {
        console.log('mock save draft submission')
    }

    return (
        <GridContainer>
            <h2 className={styles.formHeader}>{activeStep}</h2>
            <Formik
                initialValues={initialValues}
                onSubmit={(values, actions) => {
                    console.log({ values, actions })
                    handleFormSubmit()
                    actions.setSubmitting(false)
                }}
            >
                {({ handleSubmit }) => (
                    <UswdsForm
                        className={styles.formWrapper}
                        id="stateSubmissionForm"
                        onSubmit={handleSubmit}
                    >
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
                    </UswdsForm>
                )}
            </Formik>
        </GridContainer>
    )
}

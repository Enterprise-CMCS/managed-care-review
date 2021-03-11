import React from 'react'
import { Formik, FormikHelpers } from 'formik'
import {
    GridContainer,
    Form as UswdsForm,
    ButtonGroup,
    Link,
    Button,
} from '@trussworks/react-uswds'
import * as Yup from 'yup'

import styles from './StateSubmissionForm.module.scss'

import { SubmissionType } from './SubmissionType'

const STEPS = {
    SUBMISSION_TYPE: 'Submission type',
}

const StateSubmissionFormSchema = Yup.object().shape({
    program: Yup.string().required(),
    submissionDescription: Yup.string().required(
        'You must provide a description of any major changes or updates'
    ),
    submissionType: Yup.string().required('You must choose a submission type'),
})
export interface StateSubmissionFormValues {
    program: string
    submissionDescription: string
    submissionType: string
}

export const StateSubmissionForm = (): React.ReactElement => {
    // setActiveStep will be used once there are multiple form pages
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeStep, setActiveStep] = React.useState(STEPS.SUBMISSION_TYPE)
    const [showValidations, setShowValidations] = React.useState(false)

    const initialValues: StateSubmissionFormValues = {
        program: '',
        submissionDescription: '',
        submissionType: '',
    }

    const handleFormSubmit = (
        values: StateSubmissionFormValues,
        actions: FormikHelpers<StateSubmissionFormValues>
    ) => {
        console.log('mock save draft submission', values)
        setShowValidations(true)
        actions.setSubmitting(false)
    }

    return (
        <GridContainer>
            <Formik
                initialValues={initialValues}
                onSubmit={handleFormSubmit}
                validationSchema={StateSubmissionFormSchema}
            >
                {({ errors, handleSubmit, validateForm }) => (
                    <UswdsForm
                        className="usa-form--large"
                        id="stateSubmissionForm"
                        onSubmit={handleSubmit}
                    >
                        <fieldset className="usa-fieldset">
                            <legend className={styles.formHeader}>
                                <h2>{activeStep}</h2>
                            </legend>
                            <div className={styles.formContainer}>
                                <span>All fields are required</span>
                                <SubmissionType
                                    errors={errors}
                                    showValidations={showValidations}
                                />
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
                                                setShowValidations(true)
                                                console.log(
                                                    'Validation complete'
                                                )
                                            })
                                            .catch(() =>
                                                console.warn('Validation Error')
                                            )
                                    }
                                >
                                    Test Validation
                                </Button>
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

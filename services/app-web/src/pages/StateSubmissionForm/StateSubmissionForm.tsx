import React from 'react'
import { Formik, FormikHelpers, FormikErrors } from 'formik'
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

// Formik setup
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

export const StateSubmissionInitialValues: StateSubmissionFormValues = {
    program: '',
    submissionDescription: '',
    submissionType: '',
}

// Main component setup

const steps = ['SUBMISSION_TYPE', 'CONTRACT_DETAILS'] as const
type StateSubmissionFormSteps = typeof steps[number] // iterable union type

const stepsWithName: { [K in StateSubmissionFormSteps]: string } = {
    SUBMISSION_TYPE: 'Submission type',
    CONTRACT_DETAILS: 'Contract details',
}

type StateSubmissionFormProps = {
    step?: StateSubmissionFormSteps
}

export const StateSubmissionForm = ({
    step,
}: StateSubmissionFormProps): React.ReactElement => {
    const [
        activeStep,
        setActiveStep,
    ] = React.useState<StateSubmissionFormSteps>(step || steps[0])

    const [showValidations, setShowValidations] = React.useState(false)

    const handleFormSubmit = (
        values: StateSubmissionFormValues,
        formikHelpers: FormikHelpers<StateSubmissionFormValues>
    ) => {
        console.log('mock save draft submission', values)
        formikHelpers.setSubmitting(false)
        setActiveStep((prevStep) => steps[steps.indexOf(prevStep) + 1])
    }

    const CurrentFormStep = (props: {
        errors: FormikErrors<StateSubmissionFormValues>
        showValidations: boolean
    }) => {
        switch (activeStep) {
            case 'SUBMISSION_TYPE':
                return <SubmissionType {...props} />
            case 'CONTRACT_DETAILS':
                return <p> CONTRACT DETAILS</p>
            default:
                return <p> Invalid Form Step</p>
        }
    }

    return (
        <GridContainer>
            <Formik
                initialValues={StateSubmissionInitialValues}
                onSubmit={handleFormSubmit}
                validationSchema={StateSubmissionFormSchema}
                validateOnChange={showValidations}
                validateOnBlur={showValidations}
            >
                {({ errors, handleSubmit, validateForm }) => (
                    <UswdsForm
                        className="usa-form--large"
                        id="stateSubmissionForm"
                        aria-label="New Submission Form"
                        onSubmit={handleSubmit}
                    >
                        <fieldset className="usa-fieldset">
                            <legend className={styles.formHeader}>
                                <h2>{stepsWithName[activeStep]}</h2>
                            </legend>
                            <div className={styles.formContainer}>
                                <span>All fields are required</span>
                                <CurrentFormStep
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
